// Prueba rápida del sitio publicado. Solo lectura: no crea usuarios ni pedidos.
// Uso: node scripts/smoke.mjs https://usuario.github.io/repo/
import { chromium } from 'playwright'

const url = process.argv[2]
const check = (ok, msg) => {
  console.log(`${ok ? '✅' : '❌'} ${msg}`)
  if (!ok) process.exitCode = 1
}

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const jsErrors = []
page.on('pageerror', (e) => jsErrors.push(e.message))
page.on('console', (m) => m.type() === 'error' && console.log('   consola:', m.text()))

await page.goto(url)
await page.waitForSelector('.pizza-card', { timeout: 45000 })
const pizzas = await page.locator('.pizza-card h3').allInnerTexts()
check(pizzas.length > 0, `Menú (${pizzas.length}): ${pizzas.join(', ')}`)
check((await page.locator('.demo-tag').count()) === 0, 'Datos desde Supabase (sin "modo demo")')
check((await page.locator('.drink').count()) > 0, `Bebidas: ${await page.locator('.drink').count()}`)
await page.screenshot({ path: 'smoke-inicio.png' })

const chips = page.locator('#arma .chip')
await chips.nth(0).click()
await chips.nth(1).click()
const custom = await page.locator('#arma .builder-summary .grand').innerText()
check(/\$\d/.test(custom), `Arma tu pizza con 2 extras: ${custom.replace(/\s+/g, ' ')}`)

const add = page.locator('.pizza-card button')
await add.nth(0).click()
await add.nth(1).click()
await page.locator('.cart-btn').click()
const total = await page.locator('.drawer .grand').innerText()
check(/\$\d/.test(total), `Carrito con 2 pizzas del menú + delivery: ${total.replace(/\s+/g, ' ')}`)
await page.screenshot({ path: 'smoke-carrito.png' })
await page.locator('.drawer-head .icon-btn').click()

await page.goto(url + '#/login')
await page.fill('input[type=email]', 'nadie@tupizzita.cl')
await page.fill('input[type=password]', 'incorrecta123')
await page.locator('form button').click()
const err = await page.locator('.error').innerText({ timeout: 20000 })
check(/incorrect/i.test(err), `Login contra Supabase Auth responde: "${err}"`)

check(jsErrors.length === 0, `Sin errores de JavaScript${jsErrors.length ? ': ' + jsErrors.join(' | ') : ''}`)
await browser.close()
