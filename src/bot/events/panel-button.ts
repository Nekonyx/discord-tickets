import {
  PermissionOverwriteOptions,
  ThreadAutoArchiveDuration,
  BaseGuildTextChannel,
  PermissionResolvable,
  ButtonInteraction,
  ChannelType,
  userMention
} from 'discord.js'
import { ButtonComponent, Discord } from 'discordx'

import { deserializePanelButtonId, panelButtonIdPattern, isPanelButtonId } from '../utils'
import { PanelCategoryService } from '../../services/panel-category.service'
import { CategoryRoleService } from '../../services/category-role.service'
import { TicketService } from '../../services/ticket.service'

@Discord()
export class PanelButtonEvents {
  private readonly panelCategoryService = new PanelCategoryService()
  private readonly ticketService = new TicketService()
  private readonly categoryRoleService = new CategoryRoleService()

  @ButtonComponent({
    id: panelButtonIdPattern
  })
  public async onButtonInteraction(interaction: ButtonInteraction) {
    // ? isn't it overkill after using «id: panelButtonIdPattern» above?
    if (!isPanelButtonId(interaction.customId)) {
      return
    }

    await interaction.deferReply({
      ephemeral: true
    })

    const panelCategory = await this.panelCategoryService.getOne({
      id: deserializePanelButtonId(interaction.customId)
    })

    if (!panelCategory) {
      throw new Error('Panel category was not found')
    }

    const channel = await interaction.guild!.channels.fetch(panelCategory.channelId)

    if (!channel) {
      throw new Error(`Channel ${panelCategory.channelId} was not found`)
    }

    await interaction.followUp({
      content: `Создаём тикет в категории ${panelCategory.name}`
    })

    const thread = await (channel as BaseGuildTextChannel).threads
      .create({
        name: panelCategory.slug + '-' + interaction.user.username,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        type: ChannelType.PrivateThread
      })
      .catch((e) => null)

    if (!thread) {
      throw new Error('Thread was not created')
    }

    await thread.send({
      content: userMention(interaction.user.id),
      embeds: [panelCategory.embed]
    })

    await this.ticketService.create({
      categoryId: panelCategory.id,
      userId: interaction.user.id,
      channelId: thread.id
    })

    /** Привязанные к категории роли (модераторы, руководители) */
    const categoryRoles = await this.categoryRoleService.getList({
      conditions: {
        categoryId: panelCategory.id
      }
    })
    /** Участники, у которых есть любая из привязанных к категории ролей */
    const categoryStaff = (await interaction.guild!.members.fetch()).filter((member) =>
      categoryRoles.some((role) => member.roles.cache.has(role.roleId))
    )
    const categoryChannel = thread.parent!
    const permissions: (keyof PermissionOverwriteOptions)[] = [
      'ViewChannel',
      'ReadMessageHistory',
      'SendMessagesInThreads'
    ]
    // Создаём объект, который содержит в качестве ключей все значения массива permissions
    // и присваиваем каждому ключу значение true, тем самым выдавая все указанные права
    const permissionsOverwrite = permissions.reduce(
      (acc: PermissionOverwriteOptions, permission) => ((acc[permission] = true), acc),
      {}
    )

    if (!categoryStaff.size) return

    /** Роли без указанных в переменной permissions прав */
    const categoryRolesWithoutRights = categoryRoles.filter((role) =>
      permissions.some(
        (permission) => !categoryChannel.permissionsFor(role.roleId)?.has(permission)
      )
    )

    // Выдаём права на канал всем привявзанным к категории ролям
    await Promise.all(
      categoryRolesWithoutRights.map((role) =>
        categoryChannel.permissionOverwrites.create(role.roleId, permissionsOverwrite)
      )
    )

    // Упоминания работают как members.add, но не создают неудаляемые системные сообщения
    // ! Может содержать повторения, не стал нагружать код добавлением [...new Set(categoryStaff)]
    const pingMessage = await thread.send(categoryStaff.map((member) => member.toString()).join(''))
    await pingMessage.delete()
  }
}
