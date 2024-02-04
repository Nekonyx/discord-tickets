import { RoleSelectMenuInteraction } from 'discord.js'
import { SelectMenuComponent, Discord } from 'discordx'

import { categoryRolesIdPattern, deserializeCategoryRolesId } from '../utils'
import { PanelCategoryService } from '../../services/panel-category.service'
import { CategoryRoleService } from '../../services/category-role.service'

@Discord()
export class CategoryRolesEvents {
  private readonly panelCategoryService = new PanelCategoryService()
  private readonly categoryRoleService = new CategoryRoleService()

  @SelectMenuComponent({
    id: categoryRolesIdPattern
  })
  public async onRoleSelectInteraction(interaction: RoleSelectMenuInteraction) {
    await interaction.deferReply({
      ephemeral: true
    })

    const { categoryId } = deserializeCategoryRolesId(interaction.customId)
    const category = await this.panelCategoryService.getOne({ id: categoryId })

    if (!category) {
      throw new Error('Category was not found')
    }

    await this.categoryRoleService.delete({ conditions: { category: { id: categoryId } } })
    for (const role of interaction.roles.values()) {
      await this.categoryRoleService.create({
        roleId: role.id,
        categoryId
      })
    }

    await interaction.followUp(
      `Присвоенные категории \`${category.name}\` роли были обновлены на ${interaction.roles
        .map((role) => `<@&${role.id}>`)
        .join(', ')}`
    )
  }
}
