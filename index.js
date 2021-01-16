const config = require('./data/config.json')

// telegram
process.env.NTBA_FIX_319 = 1; // https://github.com/yagop/node-telegram-bot-api/issues/319
const TelegramBot = require('node-telegram-bot-api')
const bot = new TelegramBot(config.telegramToken)

// xenforo
const puppeteer = require('puppeteer')
const username = config.forumUsername
const password = config.forumPassword
const loginUrl = config.forumLoginUrl

// debug
// - call screenshot during debuging to see what pages look like at various stages
let _sscount = 0
const screenshot = async (page) => {
    _sscount++
    await page.screenshot({ path: `_/${_sscount.toString().padStart(3, '0')}.jpg`, fullPage: true })
}

// state
const fs = require('fs').promises;
const path = require('path')

const stateFilePath = path.join(__dirname, 'data', 'state.json')

const loadStateFile = async () => {
    state = await fs.readFile(stateFilePath)
    return JSON.parse(state)
}

const saveState = async (state) => {
    if (!state)
        state = {
            lastPageUrl: '',
            lastImageUrl: ''
        }

    await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2))
}

// logic
const login = async (browser, state) => {
    const page = await browser.newPage()
    await page.goto(loginUrl, { waitUntil: 'networkidle2' })
    await page.type("input[name='login']", username)
    await page.type("input[name='password']", password)
    await page.evaluate(() => document.querySelector(".p-body-content button[type='submit']").click())
    await page.waitForNavigation()
}

const crawl = async (browser, state) => {

    const page = await browser.newPage()
    const imgPage = await browser.newPage()

    await page.goto(state.lastPageUrl, { waitUntil: 'networkidle2' })

    while (true) {
        console.log('page', await page.url())

        // get images
        const images = await page.evaluate(() => {
            let sources = []
            document.querySelectorAll('.bbWrapper > .bbImageWrapper > img')
                .forEach(img => {
                    if (img.src)
                        sources.push(img.src)
                })
            return sources
        })

        // start processing after last known image
        let lastImageFound = !state.lastImageUrl
        for (let i = 0; i < images.length; i++) {
            const img = images[i]

            if (!lastImageFound && state.lastImageUrl == img) {
                lastImageFound = true
            }
            else if (lastImageFound) {
                console.log('Processing', img)
                state.lastImageUrl = img

                const imgsource = await imgPage.goto(img)
                const imgbuffer = await imgsource.buffer()
                await bot.sendPhoto('@memeflux', imgbuffer)

                // could move this out of the loop for performance increase if it becomes important
                await saveState(state)
            }
        }

        // navigate next
        const nextBtn = await page.evaluate(() => document.querySelector('.pageNav-jump--next'))
        
        if (nextBtn) {
            await page.evaluate(() => document.querySelector('.pageNav-jump--next').click())
            await page.waitForNavigation()
            // reset
            state.lastPageUrl = await page.url()
            state.lastImageUrl = ''
            await saveState(state)
        }
        else {
            console.log('No next button found')
            break
        }
    }
}

const run = async () => {
    console.log('Start')

    // bootstrap
    try {
        await fs.access(stateFilePath)
    }
    catch (e) {
        // default
        await saveState({
            lastPageUrl: config.forumThreadUrl,
            lastImageUrl: ''
        })
    }
    let state = await loadStateFile()

    console.log(state)

    // start browser
    let browser = null
    if (config.browserExecutablePath)
        browser = await puppeteer.launch({ executablePath: config.browserExecutablePath, args: ['--no-sandbox'] })
    else
        browser = await puppeteer.launch()

    await login(browser, state)
    await crawl(browser, state)
    await browser.close()

    console.log('Done')
}

run()
