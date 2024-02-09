import {
  ApplicationCommandOptionType,
  ModalSubmitInteraction,
  RoleSelectMenuBuilder,
  CommandInteraction,
  APIButtonComponent,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ModalBuilder,
  EmbedBuilder,
  ChannelType,
  TextChannel,
  ButtonStyle,
  APIEmbed
} from 'discord.js'
import { ModalComponent, SlashOption, SlashGroup, Discord, Slash } from 'discordx'

import {
  deserializeCreateCategoryModalId,
  serializeCreateCategoryModalId,
  createCategoryModalIdPattern,
  serializeCategoryRolesId,
  panelCategoryAutocomplete,
  panelAutocomplete
} from '../../utils'
import { PanelCategoryService } from '../../../services/panel-category.service'
import { CategoryRoleService } from '../../../services/category-role.service'
import { PanelService } from '../../../services/panel.service'
import { rootGroupName } from './constants'
import { Color } from '../../../constants'

const groupName = 'category'

@SlashGroup(groupName, rootGroupName)
@SlashGroup({
  description: 'Управление категориями панелей',
  root: rootGroupName,
  name: groupName
})
@Discord()
export class PanelCategoryCommand {
  private readonly panelService = new PanelService()
  private readonly panelCategoryService = new PanelCategoryService()
  private readonly categoryRoleService = new CategoryRoleService()

  @Slash({
    description: 'Создать категорию панели (интерактивно)',
    name: 'create'
  })
  public async create(
    @SlashOption({
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText],
      description: 'Канал для тикетов',
      name: 'channel',
      required: true
    })
    channel: TextChannel,
    @SlashOption({
      type: ApplicationCommandOptionType.String,
      autocomplete: panelAutocomplete,
      description: 'Панель',
      required: true,
      name: 'panel'
    })
    panelId: string,
    @SlashOption({
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText],
      description: 'Канал для логов',
      required: true,
      name: 'log'
    })
    logChannel: TextChannel,
    interaction: CommandInteraction
  ) {
    const modal = new ModalBuilder({
      customId: serializeCreateCategoryModalId({
        logChannelId: logChannel.id,
        channelId: channel.id,
        panelId
      }),
      title: 'Создание категории панели'
    })

    const fields = [
      new TextInputBuilder()
        .setStyle(TextInputStyle.Short)
        .setCustomId('name')
        .setLabel('Название категории')
        .setPlaceholder('К примеру: Техническая поддержка')
        .setRequired(true),
      new TextInputBuilder()
        .setStyle(TextInputStyle.Short)
        .setCustomId('slug')
        .setLabel('Короткое название категории')
        .setPlaceholder('Используется в названии тикета. К примеру: tech-support')
        .setRequired(true),
      new TextInputBuilder()
        .setStyle(TextInputStyle.Paragraph)
        .setCustomId('button')
        .setLabel('Настройки кнопки')
        .setPlaceholder('Можно указать название кнопки или JSON объект с полной настройкой.')
        .setRequired(true),
      new TextInputBuilder()
        .setStyle(TextInputStyle.Paragraph)
        .setCustomId('embed')
        .setLabel('Настройки приветственного эмбеда')
        .setPlaceholder('Можно указать содержимое эмбеда или JSON объект с полной настройкой.')
        .setRequired(true)
    ]

    for (const component of fields) {
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(component))
    }

    await interaction.showModal(modal)
  }

  @Slash({
    description: 'Назначить роли штата категории панели',
    name: 'roles'
  })
  public async roles(
    @SlashOption({
      type: ApplicationCommandOptionType.String,
      autocomplete: panelCategoryAutocomplete,
      description: 'Категория панели',
      required: true,
      name: 'category'
    })
    panelCategoryId: string,
    @SlashOption({
      type: ApplicationCommandOptionType.Boolean,
      description: 'Полностью очистить',
      name: 'clear',
      required: false
    })
    clear: boolean,
    interaction: CommandInteraction
  ) {
    // Если clear равен True, то удаляем все привязанные к категории роли в базе данных
    // а также в соответсвующем категории канале
    if (clear) {
      await interaction.deferReply({ ephemeral: true })

      const panelCategory = await this.panelCategoryService.getOne({ id: panelCategoryId })
      if (!panelCategory) {
        throw new Error('Category was not found')
      }
      /** Привязанные к категории роли */
      const roles = await this.categoryRoleService.getList({
        conditions: { category: { id: panelCategoryId } }
      })
      const channel = (await interaction.guild?.channels.fetch(
        panelCategory.channelId
      )) as TextChannel
      if (!channel) {
        throw new Error('Category channel was not found')
      }

      await Promise.all([
        // Удаляем все привязанные к категории роли из базы данных
        this.categoryRoleService.delete({
          conditions: { category: { id: panelCategoryId } }
        }),
        // Забираем права у каждой из ранее привязанных к категории роли
        ...roles.map((role) => channel.permissionOverwrites.delete(role.roleId))
      ])

      return interaction.followUp(`Назначенные категории \`${panelCategory.name}\` были очищены`)
    }
    // Если clear равен False, либо не был передан, то возвращаем участнику меню с выбором ролей
    // * Сами права ролям будут выданы лишь при открытии тикета. Данное меню лишь занесёт роли в БД
    const roleselectMenu = new RoleSelectMenuBuilder()
      .setCustomId(serializeCategoryRolesId({ categoryId: panelCategoryId }))
      .setMinValues(1)
      .setMaxValues(15)

    await interaction.reply({
      components: [new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleselectMenu)],
      ephemeral: true
    })
  }

  @ModalComponent({
    id: createCategoryModalIdPattern
  })
  private async createModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({
      ephemeral: true
    })

    const [nameInput, slugInput, buttonInput, embedInput] = [
      interaction.fields.getTextInputValue('name'),
      interaction.fields.getTextInputValue('slug'),
      interaction.fields.getTextInputValue('button'),
      interaction.fields.getTextInputValue('embed')
    ]

    if (!nameInput || !slugInput || !buttonInput || !embedInput) {
      await interaction.followUp({
        content: 'Все поля должны быть заполнены'
      })

      return
    }

    const { channelId, panelId, logChannelId } = deserializeCreateCategoryModalId(
      interaction.customId
    )
    const channel = await interaction.guild!.channels.fetch(channelId)
    const panel = await this.panelService.getOne({
      id: panelId
    })

    if (!channel || !channel.isTextBased()) {
      throw new Error("Channel not found or it's not a text channel")
    }

    if (!panel) {
      throw new Error('Panel not found')
    }

    let button: APIButtonComponent
    let embed: APIEmbed

    try {
      button = JSON.parse(buttonInput)
    } catch {
      button = new ButtonBuilder().setLabel(buttonInput).setStyle(ButtonStyle.Primary).toJSON()
    }

    try {
      embed = JSON.parse(embedInput)
    } catch {
      embed = new EmbedBuilder()
        .setTitle(nameInput)
        .setDescription(embedInput)
        .setColor(Color.Blue)
        .toJSON()
    }

    await this.panelCategoryService.create({
      panelId: panel.id,
      name: nameInput,
      slug: slugInput,
      logChannelId,
      channelId,
      button,
      embed
    })

    await interaction.followUp({
      content: `Категория "${nameInput}" для панели "${panel.name}" успешно создана`,
      ephemeral: true
    })
  }
}
