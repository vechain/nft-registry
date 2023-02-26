const axios = require('axios')
const file = require('file-system')
const fs = require('fs')
const path = require('path')
const hashName = require('hash-file')
const { exec } = require('child_process')
const BN = require('bignumber.js')
const { getTokens, greenFont, yellowFont } = require('./utils')

const { NETS: NET_FOLDERS } = require('./const')

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
  const infos = await getTokensInfo(folder, net)
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
        imgName: item.img ? rename(item.img) + '.webp' : ''
      }
    })

  file.mkdirSync(ASSETS)

  for (const item of listJson) {
    if (item.img) {
      file.copyFileSync(item.img, path.join(ASSETS, `${item.imgName}`))
    }
    result.push({
      address: item.address,
      name: item.name,
      creator: item.creator,
      description: item.description,
      icon: item.imgName ? `assets/${item.imgName}` : undefined,
      marketplaces: item.marketplaces || [],
      chainData: item.chainData,
      ...item.extra
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

async function getTokensInfo(folder, net) {
  const tokens = getTokens(folder)
  const result = []
  for (let i = 0; i < tokens.length; i++) {
    const item = tokens[i]
    result.push(await tokenInfo(path.join(folder, item), item.toLowerCase(), net))
  }

  return result
}

async function tokenInfo(tokenPath, address, net) {
  const files = file.readdirSync(tokenPath)
  const infoFile = path.join(tokenPath, 'info.json')
  const info = require(infoFile)
  const extraInfo = files.includes('extra.json') ? getExtraInfo(path.join(tokenPath, 'extra.json')) : null
  const marketplaceInfo = files.includes('marketplace.json') ? getMarketplaceInfo(path.join(tokenPath, 'marketplace.json')) : null
  info.img = files.includes('token.webp') ? path.join(tokenPath, 'token.webp') : ''
  info.createdAt = await getCreatedAtFromGit(tokenPath)
  info.address = address
  info.extra = extraInfo
  info.marketplaces = marketplaceInfo
  info.chainData = await getContractAttributesFromEnergy(net, address)

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

async function getContractAttributesFromEnergy(net, address) {
  try {
    const { data } = await axios.post(`https://api.vechain.energy/v1/call/${net}`, {
      clauses: [
        { to: address, signature: "name() returns (string name)" },
        { to: address, signature: "supportsInterface(bytes4 0x36372b07) returns(bool erc20)" },
        { to: address, signature: "supportsInterface(bytes4 0x01ffc9a7) returns(bool erc165)" },
        { to: address, signature: "supportsInterface(bytes4 0xa1c0ed36) returns(bool erc712)" },
        { to: address, signature: "supportsInterface(bytes4 0x80ac58cd) returns(bool erc721)" },
        { to: address, signature: "supportsInterface(bytes4 0xe5cfc6d0) returns(bool erc777)" },
        { to: address, signature: "supportsInterface(bytes4 0xd9b67a26) returns(bool erc1155)" },
        { to: address, signature: "supportsInterface(bytes4 0x2a55205a) returns(bool erc2981)" },
        { to: address, signature: "supportsInterface(bytes4 0x1820a4b3) returns(bool erc1820)" },
        { to: address, signature: "supportsInterface(bytes4 0x5b5e139f) returns(bool erc721Metadata)" },
        { to: address, signature: "supportsInterface(bytes4 0x780e9d63) returns(bool erc721Enumerable)" },
        { to: address, signature: "supportsInterface(bytes4 0x150b7a02) returns(bool erc721Receiver)" }
      ]
    })

    const attributes = data.reduce((attributes, attribute) => {
      const keys = Object.keys(attribute)
      keys
        .filter(key => !['0', '__length__'].includes(key))
        .forEach(key => {
          if (key.slice(0, 3) === 'erc') {
            attributes.supportsInterface[key] = attribute[key]
          }
          else {
            attributes[key] = attribute[key]
          }
        })
      return attributes
    }, { supportsInterface: {} })

    return attributes

  }
  catch (err) { }
}

module.exports = {
  clean: clear,
  build: packToken
}
