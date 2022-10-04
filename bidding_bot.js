import https from 'https'
const opensea = require("opensea-js");
const OpenSeaPort = opensea.OpenSeaPort;
const Network = opensea.Network;
const HDWalletProvider = require("@truffle/hdwallet-provider");
var fs = require('fs');
var request = require('request');

var obj_js = JSON.parse(fs.readFileSync('parameters_creeper_bot.json', 'utf8'));
var collections = JSON.parse(fs.readFileSync('collections.json', 'utf8'));

// var array = fs.readFileSync('Webshare 500 proxies.txt').toString().split("\n");
// function sleep(duration) {return new Promise(resolve => {setTimeout(() => {resolve()}, duration * 1000)})}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const all_accountAddress = obj_js.all_accountAddress.map(function (name) {
  return name.toLowerCase();
});

const tokenAddress = obj_js.tokenAddresses_Check[0]; //
const accountAddress = obj_js.accountAddress;
// const token_fee = collections[tokenAddress]['token_fee']
const token_fee = 0.075

const requestget = url => {
  return new Promise((resolve, reject) => {
    request(url, (err, response, body) => {
      if (!err && response.statusCode == 200){
        resolve(body);
      }else if(err){
        reject(err)
      }
      else if (!err && response.statusCode != 200){
        reject()
      }

    });
  });
};

const httpGet = url => {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error',function(err) {
      console.log(err)
      reject(err)
    });
  });
};

var proxies = [];

(async () => {
  let proxy_array = await requestget({
    'url': 'https://proxy.webshare.io/proxy/list/download/nquitkmkzvfygxiigjkwalxgeutbbvlbyerfmtvb/-/http/username/direct/',
    'method': 'GET',
    'timeout': 5000
  })
  // for (var i = obj_js.proxy_start; i < obj_js.proxy_end; i++){
  //   const vals = proxy_array.split('\r\n')[i].split(':')
  //   const proxy_api = 'http://'+ vals[2]+ ":" + vals[3] + "@" + vals[0] + ":" + vals[1]
  //   proxies.push(proxy_api);
  // }
  for (var i of obj_js.proxies_list){
    const vals = proxy_array.split('\r\n')[i].split(':')
    const proxy_api = 'http://'+ vals[2]+ ":" + vals[3] + "@" + vals[0] + ":" + vals[1]
    proxies.push(proxy_api);
  }
  await sleep(5000);
  console.log(proxy_array)
})();

var initial_ids = [];
var ids_iter = [];
var ids_new_iter = [];

var list = [];
for (var i = obj_js.limit_1; i <= obj_js.limit_2; i++) {
    list.push(i);
}

function splitToChunks(array, parts) {
  let result = [];
  for (let i = parts; i > 0; i--) {
      result.push(array.splice(0, Math.ceil(array.length / i)));
  }
  return result;
}

var arrays = splitToChunks(list,5)
for (var i = 0; i < arrays[0].length; i++){
  for (var j = 0; j < arrays.length; j++){
    if (typeof arrays[j][i] !== "undefined"){
      initial_ids.push(arrays[j][i])
      ids_iter.push(arrays[j][i])
    }
  }
}
// var counter = 0
// for (var i = obj_js.limit_1; i <= Math.ceil(obj_js.limit_2/1000)*1000; i++){
//     for (var j = 0; j <= obj_js.breaks-1; j++){
//         initial_ids.push(i+(j*1000));
//         ids_iter.push(i+(j*1000));
//         counter += 1
//         if (counter === Math.ceil(obj_js.limit_2/1000)*1000){
//             break
//         }
//     }
//     if (counter === Math.ceil(obj_js.limit_2/1000)*1000){
//         break
//     }
//   }

// initial_ids = [...new Set(initial_ids)]
// ids_iter = [...new Set(ids_iter)]

// initial_ids = initial_ids.filter(function(x) {
//     return x <= obj_js.limit_2;
// });

// ids_iter = ids_iter.filter(function(x) {
//   return x <= obj_js.limit_2;
// });

console.log(ids_iter)

var key_flag = 0;
var flag_fp = 1;
var proxy_flag = 0;
var place_bid = [];
var iter_counter = 0;
var infura_key = obj_js.INFURA[key_flag];
console.log(infura_key);

var provider = new HDWalletProvider({
  mnemonic: obj_js.mnemonic,
  providerOrUrl: infura_key,
  numberOfAddresses: 10,
  shareNonce: true,
  derivationPath: "m/44'/60'/0'/0/"
});

var seaport = new OpenSeaPort(provider, {
    networkName: Network.Main,
    apiKey: obj_js.bid_apiKey
}, (arg) => console.log(arg));

var hist_fp = {};

for (let nft of Object.keys(collections)){
  hist_fp[nft] = []
}

(async () => {
  // const ids = [200, 201, 202, 203, 204, 205, 20];
  // await sleep(5000)
  let hist_counter = 0;
  while (hist_counter < obj_js.hist_initial){
    for (let nft of Object.keys(hist_fp)){
      let flag_hist_fp = -1
      while (flag_hist_fp == -1){
        try{
          var hist_fp_body = await requestget({
            'url': 'https://api.opensea.io/api/v1/collection/' + collections[nft]['token_name'] + '/stats',
            'method': 'GET',
            'timeout': 5000
          })
          var hist_fp_value = 0;
          hist_fp_value = JSON.parse(hist_fp_body).stats.floor_price;
          if (hist_fp_value === null){
            console.log('Null floor for ' + nft)
          }
          else{
            hist_fp[nft].push(hist_fp_value)
            flag_hist_fp = 1;
          }
        }
        catch{console.log('Historical floor price api throttled. Retrying');
          proxy_flag += 1
          if (proxy_flag == proxies.length){
            proxy_flag = 0;
          }
        }
      }
    }
    hist_counter += 1
    console.log(hist_counter.toString() + ' data point added to historical floor price list.')
  }
  while (ids_iter.length > 0){
    for (const id of ids_iter) {

      iter_counter += 1
      if (iter_counter%1200 === 0){
        await sleep(15000)
        key_flag += 1;
        if (key_flag == obj_js.INFURA.length){
          key_flag = 0;
        }
        infura_key = obj_js.INFURA[key_flag];
        console.log(infura_key);
        provider.engine.stop();

        provider = new HDWalletProvider({
          mnemonic: obj_js.mnemonic,
          providerOrUrl: infura_key,
          numberOfAddresses: 10,
          shareNonce: true,
          derivationPath: "m/44'/60'/0'/0/"
        });

        seaport = new OpenSeaPort(provider, {
          networkName: Network.Main,
          apiKey: obj_js.bid_apiKey
        }, (arg) => console.log(arg));
      }

      global.proxy = proxies[proxy_flag]
      proxy_flag += 1
      if (proxy_flag == proxies.length){
        proxy_flag = 0;
      }

      console.log('Token number ' + id.toString())
      // make next loop -1. This will change based on output of API. If output is -1 then we retry, if +1 then we move to next token
      var next_loop_a = -1;
      var next_loop_b = -1;
      var fp_tries = 0;
      // Start while loop of checking API
      while (next_loop_a == -1 || next_loop_b == -1){
        // Try except statement to catch any errors
        if (next_loop_a == -1){
          try{
            //get the API return  
            // var body = await httpGet('https://api.opensea.io/api/v1/asset/' + tokenAddress + '/'+id.toString()+'/');
            var fp_body = await requestget({
              'url': 'https://api.opensea.io/api/v1/collection/' + collections[tokenAddress]['token_name'] + '/stats',
              'method': 'GET',
              'proxy': proxies[proxy_flag],
              'timeout': 5000
            })
            next_loop_a = 1;
            // console.log('Floor price obtained!')
            if (flag_fp === 1){
              var fp = JSON.parse(fp_body).stats.floor_price;
              console.log('Floor Price: ' + fp.toString(), 'Min Profit: ' + fp*(obj_js.profit_lower-token_fee).toString(),
                'Max Profit: ' + fp*(obj_js.profit_upper-token_fee).toString());
              flag_fp = 0
            }
          }
          catch{console.log('Floor bid api throttled.');
            await sleep(5000)
            next_loop_a = -1;
          }
        }
        if (next_loop_b == -1){
          try{
            var body = await requestget({
              'url': 'https://api.opensea.io/api/v1/asset/' + tokenAddress + '/' + id.toString()+ '/offers',
              headers: {
                'x-api-key': obj_js.bid_apiKey
              },
              'method': 'GET',
              'proxy': proxies[proxy_flag],
              'timeout': 5000
            })
            var body_owner = await requestget({
              'url': 'https://api.opensea.io/api/v1/asset/' + tokenAddress + '/'+id.toString()+'/',
              'method': 'GET',
              headers: {
                'x-api-key': obj_js.bid_apiKey
              },
              'proxy': proxies[proxy_flag],
              'timeout': 5000
            })
            next_loop_b = 1;
          }
          catch{console.log('Other bid api throttled. Waiting');
            await sleep(5000)
            console.log('\x1b[31m%s\x1b[0m', proxy_flag)
            next_loop_b = -1;
            proxy_flag += 1
            if (proxy_flag == proxies.length){
              proxy_flag = 0;
            }
          }
        }
        fp_tries += 1;
        if (fp_tries === 10){
          console.log('Too many floor price API throttles.')
          await sleep(60000)
          break;
        }
      }
      if (Math.min.apply(Math, hist_fp[tokenAddress])*(1 + obj_js.threshold/100) < fp){
        hist_fp[tokenAddress].push(fp);
        if (hist_fp[tokenAddress].length === obj_js.hist_max){
          hist_fp[tokenAddress].shift();
        }
        console.log('\x1b[31m%s\x1b[0m','Minimum floor price times 1.07 is ' + Math.min.apply(Math, hist_fp[tokenAddress])*(1 + obj_js.threshold/100) + ' while floor price is ' + fp.toString() + '. Skipping bidding')
        continue
      }
      else if (fp === null) {
        console.log('\x1b[31m%s\x1b[0m','Minimum floor price times 1.07 is null. Skipping bidding')
      }
      else{
        let max_hist = Math.min.apply(Math, hist_fp[tokenAddress])*(1 + obj_js.threshold/100)
        console.log('Current floor price is ' + fp.toString() + ' historical times 1.07 is ' + max_hist.toString())
        hist_fp[tokenAddress].push(fp);
        if (hist_fp[tokenAddress].length === obj_js.hist_max){
          hist_fp[tokenAddress].shift();
        }
      }
      try{
      //set results as body of api
      var result = JSON.parse(body).offers;
      let actual_owner = JSON.parse(body_owner).owner.address;
        var m = []
        var m_owner = []
        for (var r of result) {
          if ((r.maker.address != actual_owner) & (r.payment_token_contract.symbol.toLowerCase() == 'weth')) {
            m.push(parseFloat(r.current_price / 1e18));
            m_owner.push(r.maker.address);
          }
        }
        // Get floor price
        if (obj_js.FP === 0){
          var fp = JSON.parse(fp_body).stats.floor_price;
        } else{
          var fp = obj_js.FP;
        }
        // console.log(fp)
        //if there are no orders
        if (m.length === 0){
          console.log('Token has no bids, bidding.');
          console.log(id.toString(), tokenAddress);
          let bid_value = fp*(obj_js.profit_upper-token_fee).toString()
          console.log('\x1b[33m%s\x1b[0m', 'Bidding ' + bid_value + ' on ' + collections[tokenAddress]['token_name'] + ' ' + id.toString())
          seaport.createBuyOrder({asset: {tokenId: id.toString(),
          tokenAddress: tokenAddress},
          accountAddress: accountAddress,
          // startAmount: 0.001,
          startAmount: bid_value,
          expirationTime: Math.round(Date.now() / 1000 + 60 * 60 * obj_js.Bid_Time)})
          .then((res) => {console.log('\x1b[33m%s\x1b[0m', 'Bid Successful! ' + collections[tokenAddress]['token_name'] + ' ' + id.toString());}).catch((err) => {
                if (err.toString().includes('API Error 429:') || err.toString().includes('FetchError: network timeout at') || err.toString().includes('Outstanding order to wallet balance')) {
                  // console.log('\x1b[36m%s\x1b[0m', 'Will bid on ' + id.toString() +' in next loop.');
                  console.log('\x1b[36m%s\x1b[0m',err.toString());
                  // ids_new_iter.push(id);
                }
                else if (err.toString().includes('Trading is not enabled for')){
                  console.log('Flagged wallet');
                  bad_wallets.push(wallet);
                }
                else if (err.toString().includes('API Error 400:')){
                  console.log('Not bidding on auction');
                }
                else{
                  console.log(err.toString())
                };
            });
          }
        else {
          let cmb =  Math.max.apply(Math,m);
          let owner_cmb = m_owner[m.indexOf(cmb)];
          // if (owner_cmb === accountAddress.toLowerCase()){
          if (all_accountAddress.indexOf(owner_cmb) >= 0){
            console.log('Already own highest bid, not bidding.');
            console.log(id.toString(), tokenAddress)
          }
          else{
            if (cmb < fp*(obj_js.profit_lower-token_fee) & cmb >= fp*(obj_js.profit_upper-token_fee)){ //if highest bid is between 10 and 25% profit margin
            // if (1 == 1){
              // if (cmb < 0.4){
              console.log('Token has bids, bidding')
              console.log(id.toString(), tokenAddress)
              let bid_value = cmb + 0.0001
              console.log('\x1b[33m%s\x1b[0m', 'Bidding ' + bid_value + ' on ' + collections[tokenAddress]['token_name'] + ' ' + id.toString())
              seaport.createBuyOrder({asset: {tokenId: id.toString(),
                                                        tokenAddress: tokenAddress},
                                                        accountAddress: accountAddress,
                                                        // startAmount: 0.001,
                                                        startAmount: bid_value,
                                                        expirationTime: Math.round(Date.now() / 1000 + 60 * 60 * obj_js.Bid_Time)})
                                                        .then((res) => { console.log('\x1b[33m%s\x1b[0m', 'Bid Successful! ' + collections[tokenAddress]['token_name'] + ' ' + id.toString());}).catch((err) => {
                                                          if (err.toString().includes('API Error 429:') || err.toString().includes('FetchError: network timeout at') || err.toString().includes('Outstanding order to wallet balance')) {
                                                            // console.log('\x1b[36m%s\x1b[0m', 'Will bid on ' + id.toString() +' in next loop.');
                                                            console.log('\x1b[36m%s\x1b[0m',err.toString());
                                                            // ids_new_iter.push(id);
                                                          }
                                                          else if (err.toString().includes('Trading is not enabled for')){
                                                            console.log('Flagged wallet');
                                                            bad_wallets.push(wallet.toLowerCase());
                                                          }
                                                          else if (err.toString().includes('API Error 400:')){
                                                            console.log('Not bidding on auction');
                                                          }
                                                          else{
                                                            console.log(err.toString())
                                                          };
                                                        })
            }
            else if (cmb < fp*(obj_js.profit_upper-token_fee)){ //if highest bid is very low
              // if (cmb < 0.4){
                console.log('Token has very low bids, bidding')
                console.log(id.toString(), tokenAddress)
                let bid_value = fp*(obj_js.profit_upper-token_fee).toString()
                console.log('\x1b[33m%s\x1b[0m', 'Bidding ' + bid_value + ' on ' + collections[tokenAddress]['token_name'] + ' ' + id.toString())
                seaport.createBuyOrder({asset: {tokenId: id.toString(),
                                                          tokenAddress: tokenAddress},
                                                          accountAddress: accountAddress,
                                                          // startAmount: 0.001,
                                                          startAmount: bid_value,
                                                          expirationTime: Math.round(Date.now() / 1000 + 60 * 60 * obj_js.Bid_Time)})
                                                          .then((res) => { console.log('\x1b[33m%s\x1b[0m', 'Bid Successful! ' + collections[tokenAddress]['token_name'] + ' ' + id.toString());}).catch((err) => {
                                                            if (err.toString().includes('API Error 429:') || err.toString().includes('FetchError: network timeout at') || err.toString().includes('Outstanding order to wallet balance')) {
                                                              // console.log('\x1b[36m%s\x1b[0m', 'Will bid on ' + id.toString() +' in next loop.');
                                                              // ids_new_iter.push(id);
                                                              console.log('\x1b[36m%s\x1b[0m',err);
                                                            }
                                                            else if (err.toString().includes('Trading is not enabled for')){
                                                              console.log('Flagged wallet');
                                                              bad_wallets.push(wallet.toLowerCase());
                                                            }
                                                            else if (err.toString().includes('API Error 400:')){
                                                              console.log('Not bidding on auction');
                                                            }
                                                            else{
                                                              console.log(err.toString())
                                                            };
                                                          })
            }
            else{
              console.log('Top bid too high. Bidding within profit margin.');
              var lower_bids = m.filter(function(x) {
                return x < fp*(obj_js.profit_lower-token_fee);
              });

              var nb = Math.max.apply(Math,lower_bids)
              let owner_nb = m_owner[m.indexOf(nb)];

              if (lower_bids.length===0){
                console.log('No lower bids. Bidding')
                console.log(id.toString(), tokenAddress)
                let bid_value = fp*(obj_js.profit_upper-token_fee).toString()
                console.log('\x1b[33m%s\x1b[0m', 'Bidding ' + bid_value + ' on ' + collections[tokenAddress]['token_name'] + ' ' + id.toString())
                seaport.createBuyOrder({asset: {tokenId: id.toString(),
                  tokenAddress: tokenAddress},
                  accountAddress: accountAddress,
                  // startAmount: 0.001,
                  startAmount: bid_value,
                  expirationTime: Math.round(Date.now() / 1000 + 60 * 60 * obj_js.Bid_Time)})
                  .then((res) => { console.log('\x1b[33m%s\x1b[0m', 'Bid Successful! ' + collections[tokenAddress]['token_name'] + ' ' + id.toString());}).catch((err) => {
                    if (err.toString().includes('API Error 429:') || err.toString().includes('FetchError: network timeout at') || err.toString().includes('Outstanding order to wallet balance')) {
                      // console.log('\x1b[36m%s\x1b[0m', 'Will bid on ' + id.toString() +' in next loop.');
                      // ids_new_iter.push(id);
                      console.log('\x1b[36m%s\x1b[0m',err.toString());
                    }
                    else if (err.toString().includes('Trading is not enabled for')){
                      console.log('Flagged wallet');
                      bad_wallets.push(wallet.toLowerCase());
                    }
                    else if (err.toString().includes('API Error 400:')){
                      console.log('Not bidding on auction');
                    }
                    else{
                      console.log(err.toString())
                    };
                  })
              }
              else{
                if (all_accountAddress.indexOf(owner_nb) >= 0){
                  console.log('Already own second highest bid, not bidding.');
                }
                else if (nb < fp*(obj_js.profit_lower-token_fee) & nb >= fp*(obj_js.profit_upper-token_fee)){ //if highest bid is between 10 and 25% profit margin
                  // if (cmb < 0.4){
                  console.log('Second highest bid within profit margin. Bidding higher than that')
                  console.log(id.toString(), tokenAddress)
                  let bid_value = nb + 0.0001
                  console.log('\x1b[33m%s\x1b[0m', 'Bidding ' + bid_value + ' on ' + collections[tokenAddress]['token_name'] + ' ' + id.toString())
                  seaport.createBuyOrder({asset: {tokenId: id.toString(),
                                                            tokenAddress: tokenAddress},
                                                            accountAddress: accountAddress,
                                                            // startAmount: 0.001,
                                                            startAmount: bid_value,
                                                            expirationTime: Math.round(Date.now() / 1000 + 60 * 60 * obj_js.Bid_Time)})
                                                            .then((res) => { console.log('\x1b[33m%s\x1b[0m', 'Bid Successful! ' + collections[tokenAddress]['token_name'] + ' ' + id.toString());}).catch((err) => {
                                                              if (err.toString().includes('API Error 429:') || err.toString().includes('FetchError: network timeout at') || err.toString().includes('Outstanding order to wallet balance')) {
                                                                // console.log('\x1b[36m%s\x1b[0m', 'Will bid on ' + id.toString() +' in next loop.');
                                                                // ids_new_iter.push(id);
                                                                console.log('\x1b[36m%s\x1b[0m',err.toString());
                                                              }
                                                              else if (err.toString().includes('Trading is not enabled for')){
                                                                console.log('Flagged wallet');
                                                                bad_wallets.push(wallet.toLowerCase());

                                                              }
                                                              else if (err.toString().includes('API Error 400:')){
                                                                console.log('Not bidding on auction');
                                                              }
                                                              else{
                                                                console.log(err.toString())
                                                              };
                                                            })
                }
                else if (nb < fp*(obj_js.profit_upper-token_fee)){ //if highest bid is very low
                  // if (cmb < 0.4){
                    console.log('Second highest bid is too low. Bidding in profit margin.')
                    let bid_value = fp*(obj_js.profit_upper-token_fee)
                    console.log('\x1b[33m%s\x1b[0m', 'Bidding ' + bid_value + ' on ' + collections[tokenAddress]['token_name'] + ' ' + id.toString())
                    seaport.createBuyOrder({asset: {tokenId: id.toString(),
                                                              tokenAddress: tokenAddress},
                                                              accountAddress: accountAddress,
                                                              // startAmount: 0.001,
                                                              startAmount: bid_value,
                                                              expirationTime: Math.round(Date.now() / 1000 + 60 * 60 * obj_js.Bid_Time)})
                                                              .then((res) => { console.log('\x1b[33m%s\x1b[0m', 'Bid Successful! ' + collections[tokenAddress]['token_name'] + ' ' + id.toString());}).catch((err) => {
                                                                if (err.toString().includes('API Error 429:') || err.toString().includes('FetchError: network timeout at') || err.toString().includes('Outstanding order to wallet balance')) {
                                                                  // console.log('\x1b[36m%s\x1b[0m', 'Will bid on ' + id.toString() +' in next loop.');
                                                                  // ids_new_iter.push(id);
                                                                  console.log('\x1b[36m%s\x1b[0m',err.toString());
                                                                }
                                                                else if (err.toString().includes('Trading is not enabled for')){
                                                                  console.log('Flagged wallet');
                                                                  bad_wallets.push(wallet.toLowerCase());
                                                                }
                                                                else if (err.toString().includes('API Error 400:')){
                                                                  console.log('Not bidding on auction');
                                                                }
                                                                else{
                                                                  console.log(err.toString())
                                                                };
                                                              })
                }
              }
              // console.log('Max Bid: ' + cmb.toString(), 'Floor Price: ' + fp.toString(), 'Min Profit: ' + fp*(obj_js.profit_lower-token_fee).toString(),
              // 'Max Profit: ' + fp*(obj_js.profit_upper-token_fee).toString())
            }
          }
        }
      }
      catch{
        console.log('Other error for ' + id.toString());
        ids_new_iter.push(id);
      }
      await sleep(obj_js.wait_time);
    }
    await Promise.all(place_bid).then((res) => {console.log('All bids done')});
    console.log(ids_new_iter)
    ids_iter = ids_new_iter;
    ids_new_iter = [];
    if (ids_iter.length === 0 || ids_iter.length <= 5){
      ids_iter = initial_ids;
    };
    console.log(ids_iter);
  };
})();
