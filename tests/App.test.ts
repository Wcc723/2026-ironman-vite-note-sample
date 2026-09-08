import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from '../src/App.vue'

describe('App', () => {
  it('creates a note through the editor and finds it with search', async () => {
    const wrapper = mount(App)

    await wrapper.get('.new-note-button').trigger('click')
    await wrapper.get('input[placeholder="替這個念頭取個名字"]').setValue('下次會議')
    await wrapper.get('textarea').setValue('準備三個提案方向')
    await wrapper.get('input[placeholder="例如：靈感, 工作, 週末"]').setValue('工作, 提案')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('下次會議')
    expect(wrapper.text()).toContain('#工作')

    await wrapper.get('input[type="search"]').setValue('提案')
    expect(wrapper.text()).toContain('下次會議')

    await wrapper.get('input[type="search"]').setValue('不存在')
    expect(wrapper.text()).toContain('找不到相符的記錄')
  })
})
