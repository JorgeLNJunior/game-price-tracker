import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { Platform } from '@/types/Platform'

import PlatformPriceCard from './PlatformPriceCard.vue'

describe('PlatformPriceCard', () => {
  it('should render the price', async () => {
    const url = 'https://google.com'
    const platform = Platform.STEAM
    const price = '30.15'
    const priceWithCurrency = 'R$ 30,15'

    const wrapper = mount(PlatformPriceCard, {
      props: { url, platform, price }
    })

    const value = wrapper.get('[test-data="price"]').text()

    expect(value).toBe(priceWithCurrency)
  })

  it('should render a steam icon if it receives steam as platform', async () => {
    const url = 'https://google.com'
    const platform = Platform.STEAM
    const price = '30.15'

    const wrapper = mount(PlatformPriceCard, {
      props: { url, platform, price }
    })

    const icon = wrapper.get('[test-data="steam-icon"]')

    expect(icon).toBeDefined()
  })

  it('should render a nuuvem icon if it receives nuuvem as platform', async () => {
    const url = 'https://google.com'
    const platform = Platform.NUUVEM
    const price = '30.15'

    const wrapper = mount(PlatformPriceCard, {
      props: { url, platform, price }
    })

    const icon = wrapper.get('[test-data="nuuvem-icon"]')

    expect(icon).toBeDefined()
  })
})
