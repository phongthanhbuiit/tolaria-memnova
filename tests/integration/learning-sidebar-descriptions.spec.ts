import { expect, test } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'

test.use({ locale: 'vi-VN' })

test('Home and Study explain their destinations without changing sidebar navigation', async ({ page }, info) => {
  const vault = createFixtureVaultCopy()
  try {
    await openFixtureVault(page, vault)
    const nav = page.getByTestId('sidebar-top-nav')
    const home = nav.getByRole('button', { name: 'Trang chủ', exact: true })
    const study = nav.getByRole('button', { name: /^Ôn tập/ })
    const homeHelp = 'Xem tổng quan thư viện và tiến độ ôn tập.'
    const studyHelp = 'Duyệt các ghi chú trong lịch ôn.'
    const overview = page.getByText(/^Viết như bình thường\. Khi muốn ôn một ghi chú/)
    await home.click()
    await expect(overview).toBeVisible()
    await study.hover()
    await page.screenshot({ path: info.outputPath('study-sidebar.png') })
    await expect(home).toHaveAccessibleDescription(homeHelp)
    await expect(study).toHaveAccessibleDescription(studyHelp)
    await expect(page.getByRole('tooltip')).toHaveText(studyHelp)
    await page.screenshot({ path: info.outputPath('study-sidebar-tooltip.png') })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip')).toBeHidden()

    await study.click()
    await expect(overview).toBeHidden()
    await home.focus()
    await expect(page.getByRole('tooltip')).toHaveText(homeHelp)
    await page.keyboard.press('Enter')
    await expect(overview).toBeVisible()
  } finally {
    await page.close()
    removeFixtureVaultCopy(vault)
  }
})
