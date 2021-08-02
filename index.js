const readline = require("readline")
const dialog = require('dialog-node')
const axios = require('axios')
const fs = require('fs')

async function start() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question('Очистить файл с результатами? (Y/n)', async (clearFile) => {
    if (!clearFile || clearFile.toLowerCase() === 'y') {
      fs.truncate('result.txt', 0, () => console.log('Файл был очищен'))
    }

    rl.question('Укажи номер с какой ссылки начать проверку (по умолчанию = 1)', async (startFrom) => {
      try {
        const filePath = await getFilePath()
        const links = await parseFile(filePath)
        await checkLinks(links, +startFrom)
        console.log('Результат работы записан в файл result.txt')
      } catch (e) {
        console.error(e)
      }

      rl.close()
    })
  })
}

function getFilePath() {
  return new Promise((resolve, reject) => {
    dialog.fileselect('Выберите файл csv', 'Выбор файла', 0, (code, retVal) => {
      if (retVal.length) {
        let res = retVal.startsWith('Users') ? retVal : retVal.substr(retVal.indexOf('Users'), retVal.length - 1);

        return resolve(`/${res.replaceAll(':', '/')}`)
      } else {
        reject('Произошла ошибка при чтении пути к файлу')
      }
    })
  })
}

function parseFile(filePath) {
  return new Promise((resolve, reject) => {
    if (!filePath) reject('Путь к файлу не может быть пустым')

    if (!fs.existsSync(filePath)) {
      reject('Некорректный путь до файла')
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
      const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gm
      const string = data.replaceAll(/\r?\n|\r/g, '')
      const matches = string.match(regex)

      resolve(matches)
    })
  })
}

async function checkLinks(links, startFrom) {
  const file = fs
    .createWriteStream('result.txt', { flags:'as+' })
    .on('error', (e) => console.error(e))

  let iterator = startFrom || 1

  if (!links || !links.length) {
    return null
  }

  const reducesLinks = links.slice(iterator - 1, links.length)

  console.log('links.length', links.length)
  console.log('reducesLinks.length', reducesLinks.length)

  for await (const link of reducesLinks) {
    console.log(`Link ${iterator} of ${links.length}`)
    try {
      const res = await axios.get(link)

      if (res.request?._redirectable?._redirectCount) {
        console.log('Link were redirected:', link)
        writeLine(file, { url: link, status: res.status, redirect: true })
      } else {
        console.log('Link success')
        // writeLine(file, { url: link, status: res.status })
      }

      console.log('Status', res.status)
    } catch (e) {
      console.error('Link error:', link)
      writeLine(
        file,
        {
        url: link,
        status: e.response?.status,
        text: e.response?.statusText
      })
    }

    console.log('--------')
    iterator++
  }

  file.end()
  return null
}

function writeLine(file, data) {
  let str = data.url

  if (data.status) str += `, Code: ${data.status}`
  if (data.redirect) str += `, Redirect`
  if (data.text) str += `, Message: ${data.text}`

  file.write(str + '\n')
}

start()
// checkLinks(['https://b2btrade.ru/catalog/product-east-bali-cashews-elektricheskiy-shto'])
//   .then(res => console.log('res', res))
