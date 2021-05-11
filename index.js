const readline = require("readline")
const dialog = require('dialog-node')
const axios = require('axios')
const fs = require('fs')

async function start() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question('Откуда берем ссылки?\n Из файла (F) или с сайта (S)', async (variant) => {
    if (variant === 'f' || 'F') {
      try {
        const filePath = await getFilePath()
        const links = await parseFile(filePath)
        // const links = [
        //   'https://b2btrade.ru/product-sladkie-grezy-oreshki-so-sguschenkoy',
        //   'https://b2btrade.ru/catalog/product-east-bali-cashews-elektricheskiy-shto',
        //   'https://b2btrade.ru/asd'
        // ]
        const result = await checkLinks(links)
        writeInFile(result)
        console.log('Результат работы записан в файл result.txt')
      } catch (e) {
        console.error(e)
      }
    } else {
      parseSite()
    }

    rl.close()
  })
}

function getFilePath() {
  return new Promise((resolve, reject) => {
    dialog.fileselect('Выберите файл csv', 'Выбор файла', 0, (code, retVal) => {
      if (retVal.length) {
        return resolve(`/${retVal.replaceAll(':', '/')}`)
      } else {
        reject('Произошла ошибка при чтении пути к файлу')
      }
    })
  })
}

function parseFile(filePath) {
  return new Promise((resolve, reject) => {
    if (!filePath) reject('Путь к файлу не может быть пустым')

    fs.readFile(filePath, 'utf8',(err, data) => {
      const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gm
      const string = data.replaceAll(/\r?\n|\r/g, '')
      const matches = string.match(regex)

      resolve(matches)
    })
  })
}

async function checkLinks(links) {
  const result = {
    success: [],
    redirect: [],
    error: []
  }
  let iterator = 1

  if (!links || !links.length) {
    return result
  }

  for await (const link of links) {
    try {
      const res = await axios.get(link)
      console.log(`Link ${iterator} of ${links.length}`)

      if (res.request?._redirectable?._redirectCount) {
        console.log('Link were redirected:', link)
        result.redirect.push({ url: link, status: res.status, redirect: true })
      } else {
        console.log('Link success:', link)
        result.success.push({ url: link, status: res.status })
      }

      console.log('res.status', res.status)
    } catch (e) {
      console.error('Link error:', link)
      result.error.push({
        url: link,
        status: e.response?.status,
        text: e.response?.statusText
      })
    }

    iterator++
  }

  return result
}

function writeInFile(resultArray) {
  if (!resultArray) {
    return null
  }

  const file = fs.createWriteStream('result.txt')
    .on('error', (e) => console.error(e))

  Object.keys(resultArray).forEach(key => {
    file.write(key.toUpperCase() + ':\n')
    for (const item of resultArray[key]) {
      let str = item.url

      if (item.status) str += `, Code: ${item.status}`
      if (item.redirect) str += `, Redirect`
      if (item.text) str += `, Message: ${item.text}`

      file.write(str + '\n')
    }
  })

  file.end()
}

async function parseSite() {
  console.log('тут нужно дописать функционал конечно')
}

start()
// checkLinks(['https://b2btrade.ru/catalog/product-east-bali-cashews-elektricheskiy-shto'])
//   .then(res => console.log('res', res))
