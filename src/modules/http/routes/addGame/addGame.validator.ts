import { z } from 'zod'

import { Validator } from '../../../../types/validator.type'

export class AddGameValidator implements Validator {
  public validate(data: unknown) {
    const schema = z.object({
      title: z.string(),
      steam_url: z
        .string()
        .regex(/^https:\/\/store.steampowered.com\/app\/[0-9]{1,7}\/\S+/),
      green_man_gaming_url: z
        .string()
        .regex(/^https:\/\/www.greenmangaming.com\/games\/\S+/)
        .optional(),
      nuuvem_url: z
        .string()
        .regex(/^https:\/\/www.nuuvem.com\/br-en\/item\/\S+/)
        .optional()
    })

    const validation = schema.safeParse(data)
    if (validation.success) return { success: true }

    return { success: false, errors: validation.error.issues as unknown }
  }
}