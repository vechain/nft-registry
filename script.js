const axios = require('axios')
const file = require('file-system')
const fs = require('fs')
const path = require('path')
const hashName = require('hash-file')
const { exec } = require('child_process')
const BN = require('bignumber.js')
const { getTokens, greenFont, yellowFont } = require('./utils')

const { NETS: NET_FOLDERS, NODES } = require('./const')

const DIST = path.join(__dirname, './dist')
const ASSETS = path.join(DIST, 'assets')

const clear = () => {
  console.time(greenFont('clean'))

  let hasDist = true
  try {
    fs.statSync(DIST)
  } catch (error) {
    hasDist = false
  }
  if (hasDist) {
    file.rmdirSync(DIST)
  }

  console.timeEnd(greenFont('clean'))
}

async function packToken(net) {
  console.time(greenFont(`build-${net}-tokens`))

  const folder = path.join(__dirname, `./tokens/${NET_FOLDERS[net]}`)
  const infos = await getTokensInfo(folder)
  let result = []
  const listJson = infos
    .sort((a, b) => {
      if (a.createdAt < b.createdAt) {
        return -1
      } else {
        return 1
      }
    })
    .map(item => {
      return {
        ...item,
        imgName: rename(item.img) + '.webp'
      }
    })

  file.mkdirSync(ASSETS)

  for (const item of listJson) {
    file.copyFileSync(item.img, path.join(ASSETS, `${item.imgName}`))
    result.push({
      address: item.address,
      name: item.name,
      creator: item.creator,
      description: item.description,
      icon: `assets/${item.imgName}`,
      marketplaces: item.marketplaces,
      ...item.extra,
    })
  }

  console.table(listJson, [
    'address',
    'name',
    'creator',
    'createdAt'
  ])

  file.writeFileSync(
    path.join(__dirname, `./dist/${net}.json`),
    JSON.stringify(result, null, 2)
  )
  console.timeEnd(greenFont(`build-${net}-tokens`))
}

function rename(img) {
  return hashName.sync(img)
}

async function getTokensInfo(folder) {
  const tokens = getTokens(folder)
  const result = []
  for (let i = 0; i < tokens.length; i++) {
    const item = tokens[i]
    result.push(await tokenInfo(path.join(folder, item), item.toLowerCase()))
  }

  return result
}

async function tokenInfo(tokenPath, address) {
  const files = file.readdirSync(tokenPath)
  const infoFile = path.join(tokenPath, 'info.json')
  const img = path.join(tokenPath, 'token.webp')
  const info = require(infoFile)
  let extraInfo = null
  let marketplaceInfo = null
  if (files.includes('extra.json')) {
    extraInfo = getExtraInfo(path.join(tokenPath, 'extra.json'))
  }
  if (files.includes('marketplace.json')) {
    marketplaceInfo = getMarketplaceInfo(path.join(tokenPath, 'marketplace.json'))
  }
  info.img = img
  info.createdAt = await getCreatedAtFromGit(tokenPath)
  info.address = address
  info.extra = extraInfo
  info.marketplaces = marketplaceInfo

  return info
}

function getExtraInfo(filePath) {
  const urlRegExp = /(https):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/
  const keys = ['website', 'whitePaper']
  const LinkSymbol = 'links'
  const linkNames = ['discord', 'twitter', 'telegram', 'facebook', 'medium', 'github', 'slack']

  const extraInfo = require(filePath)
  const links = extraInfo[LinkSymbol]
  const linkKeys = links ? Object.keys(links) : null
  let result = {}
  let linksTemp = []

  keys.forEach(item => {
    if (!extraInfo[item]) {
      return
    }
    if (!urlRegExp.test(extraInfo[item])) {
      console.warn(yellowFont(`The ${item} link invalid`))
      return
    }
    result[item] = extraInfo[item]
  })
  if (linkKeys && linkKeys.length) {
    linkKeys.forEach(item => {
      if (linkNames.includes(item) && links[item]) {
        if (urlRegExp.test(links[item])) {
          linksTemp.push({
            [item]: links[item]
          })
        } else {
          console.warn(yellowFont(`The ${item} link invalid`))
        }
      }
    })
  }

  if (linksTemp.length) {
    result[LinkSymbol] = linksTemp
  }

  return result
}

function getMarketplaceInfo(filePath) {
  const urlRegExp = /(https):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/

  const marketplaces = require(filePath)
  const result = []

  if (!Array.isArray(marketplaces)) {
    console.warn(yellowFont(`marketplace.json is no valid array`))
    return
  }

  marketplaces.forEach((marketplace, index) => {
    if (!urlRegExp.test(marketplace.link)) {
      console.warn(yellowFont(`The marketplace at index ${index} link is invalid`))
      return
    }

    if (marketplace.tokenLink && !urlRegExp.test(marketplace.tokenLink)) {
      console.warn(yellowFont(`The marketplace at index ${index} tokenLink is invalid`))
      return
    }

    if (marketplace.tokenLink && !marketplace.tokenLink.includes('{{tokenId}}')) {
      console.warn(yellowFont(`The marketplace at index ${index} tokenLink is does not contain a {{tokenId}} placeholder`))
      return
    }

    if (!marketplace.name) {
      console.warn(yellowFont(`The marketplace at index ${index} name is invalid`))
      return
    }

    result.push(marketplace)
  })

  return result
}

async function getCreatedAtFromGit(dirPath) {
  const command =
    'git log --diff-filter=A --follow --format=%aD -- [path] | tail -1'
  return new Promise((resolve, reject) => {
    exec(command.replace('[path]', dirPath), (err, stdout, stderr) => {
      if (err) return reject(err)
      if (stderr) return reject(stderr)
      if (!stdout)
        return reject(
          new Error('Can not find create time from git for dir: ' + dirPath)
        )
      return resolve(new Date(stdout))
    })
  })
}

module.exports = {
  clean: clear,
  build: packToken
}
