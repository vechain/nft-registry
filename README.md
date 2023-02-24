# VeChain NFT registry

The NFT registry is a repository of known NFT contracts with meta information that may not available on the chain.  
Adding Tokens or suggesting changes can be done thru Pull Requests.  
The original list was created from Milos at [vnft-tools.com](https://vnft-tools.com/). The repository was is structural based on the official [token registry](https://github.com/vechain/token-registry)


## Requirements 
1. Make sure the contract address is correct (main/test)
2. Token image is required
3. Folder name must be the same as the contract address 
4. Clear and simple description 
5. Comply with directory & contents rules

## Getting Ready for Submission
### Fork Token-registry
Forking a repository allows you to create your token details and send a pull request for the maintainers to review and merge into *NFT registry*.
### Generate Token Information
1. Create a directory in [main](tokens/main) /[test](tokens/test)/both and named the directory with **Contract address**.

> Contract address start with **0x + 40 characters and must be lower case**, E.g., `0x0000000000000000000000000000456e65726779`.

```
├── main 
│   └── 0xb81E9C5f9644Dec9e5e3Cac86b4461A222072302 //Contract address
│       ├── token.webp
│       ├── info.json
│       └── additional.json
```


2. Import your token image into the directory and named it `token`.**(Image must be `webp` format, `transparent background` and `256 x 256` pixel size)**

3. Generate a **info.json** file includes token details.


```json
{
    "address": "0xb81E9C5f9644Dec9e5e3Cac86b4461A222072302",
    "name": "vnt",
    "title": "VeChain Node Token",
    "creator": "VeChain",
    "description": "X-Node"
}
```

4. Generate an **extra.json** file includes following details. 

```
{
  "website":"https://www.example.com/", 
  "links":{
      "discord":"https://discord.com/example",
      "twitter":"https://twitter.com/example",
      "telegram":"https://t.me/example",
      "facebook":"https://www.facebook.com",
      "medium":"https://medium.com/@example",
      "github":"https://github.com/example",
      "slack":"https://example.slack.com/"
    },
  "whitePaper":"https://www.example.com/whitepaper/"
}

```

4. Generate a **marketplace.json** file includes following details. 

```
[
  {
    "title": "VeChainStats",
    "link": "https://manager.vechainstats.com/vnt-marketplace",
    "tokenLink": "https://vechainstats.com/nft/vechain-nodes/{{tokenId}}"
  }
]

```

> Only Discord / Twitter / Telegram / Facebook / Medium / Github / Slack are supported

### Making a Pull Request / Submit Your token
After [Create a pull request](https://help.github.com/en/articles/creating-a-pull-request), your pull request will be reviewed by maintainers. Once the review is completed, your token will be merged into the base branch.

## Get Approved token list

1. Get tokens information

`https://vechain-energy.github.io/nft-registry/{main|test}.json`

2. Get token icon

`https://vechain-energy.github.io/nft-registry/assets/{item.icon}`
