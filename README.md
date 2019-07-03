# IOV-Faucet

[![Build Status](https://travis-ci.com/iov-one/iov-faucet.svg?branch=master)](https://travis-ci.com/iov-one/iov-faucet)
[![Docker Pulls](https://img.shields.io/docker/pulls/iov1/iov-faucet.svg)](https://hub.docker.com/r/iov1/iov-faucet/)

The usage of this faucet is very simple, to install it, run:

```
yarn install
yarn build
```

Then start it for a IOV development blockchain using:

```
yarn dev-start
```

Make sure to take note of the passphrase used, as this is the only time it will be displayed.

Advanced users that want to provide their own passphrase can do so like this:

```
yarn install
yarn build
FAUCET_MNEMONIC="<secret mnemonic>" ./bin/iov-faucet start <codec> <chain url>
```

## Usage

```
Usage: iov-faucet action [arguments...]

Positional arguments per action are listed below. Arguments in parentheses are optional.

help      Shows a help text and exits

version   Prints the version and exits

generate  Generates a random mnemonic, shows derived faucet addresses and exits
           1  Codec
           2  Chain ID

start     Starts the faucet
           1  Codec
           2  Node base URL, e.g. wss://bov.friendnet-fast.iov.one

Environment variables

FAUCET_COIN_TYPE          Coin type of the faucet (see README). Defaults to 1.
FAUCET_INSTANCE           Instance number of the faucet for load balancing.
                          Defaults to 0.
FAUCET_CONCURRENCY        Number of distributor accounts. Defaults to 5.
FAUCET_PORT               Port of the webserver. Defaults to 8000.
FAUCET_MNEMONIC           Secret mnemonic that serves as the base secret for the
                          faucet HD accounts
FAUCET_CREDIT_AMOUNT_TKN  Send this amount of TKN to a user requesting TKN. TKN is
                          a placeholder for the token ticker. Defaults to 10.
FAUCET_REFILL_FACTOR      Send factor times credit amount on refilling. Defauls to 8.
FAUCET_REFILL_THRESHOLD   Refill when balance gets below factor times credit amount.
                          Defaults to 20.
```

### Development

The yarn script `dev-start` calls `start` with
a set of default options for local development. It uses a development mnemonic,
the BNS codec and the node `ws://localhost:23456`.

```
yarn install
yarn build
yarn dev-start
```

### Faucet HD wallet

One instance of the faucet can serve multiple tokens on a single blockchain. Multiple
instances can be created for load balaning. The faucet is powered by a SLIP-0010 wallet
such that all chains and all instances can use a single secret mnemonic.
The BIP43 compliant HD derivation path of faucet is

```
m / purpose' / coin_type' / instance_index' / account_index'
```

with

* `purpose`: 1229936198 (big endian of ascii "IOVF")
* `coin_type`: from SLIP-0044 or custom value. This describes the blockchain, not
  the token. All tokens in one instance are served from a single coin type. Note that
  SLIP-0044 suggests value `1` for all testnets.
* `instance_index`: 0-based index of the instance
* `account_index`: 0-based index of the account. Account 0 is the token holder and
   account 1...FAUCET_CONCURRENCY are the distributor accounts.

### Working with docker

* Build an artifact

```bash
docker build -t iov1/iov-faucet:manual .
```

* Version and help

```bash
docker run --read-only --rm iov1/iov-faucet:manual version
docker run --read-only --rm iov1/iov-faucet:manual help
```

* Run faucet

```bash
FAUCET_MNEMONIC="degree tackle suggest window test behind mesh extra cover prepare oak script" docker run --read-only \
  -e FAUCET_MNEMONIC \
  -p 8000:8000 \
  --rm iov1/iov-faucet:manual \
  start bns wss://bov.friendnet-fast.iov.one
```

### Using the faucet

Now that the faucet has been started up, you can send credit requests to it. This can be done with a simple http POST request. These commands assume the faucet is running locally, be sure to change it from `localhost` if your situation is different.

```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"ticker":"CASH","address":"tiov1k898u78hgs36uqw68dg7va5nfkgstu5z0fhz3f"}' \
  http://localhost:8000/credit
```

### Checking the faucets status

The faucet provides a simple status check in the form of an http GET request. As above, make sure to adjust the URL as necessary.

```
curl http://localhost:8000/status
```

## Versions and compatibility overview

| iov-faucet | IOV-Core | BNSd support    | New features     |
|------------|----------|-----------------|------------------|
| 0.7.x      | 0.15.x   | 0.16.x          |                  |
| 0.6.x      | 0.14.x   | 0.14.x          | BNS fee support  |
| 0.5.x      | 0.12.x   | 0.10.x – 0.11.x |                  |
| 0.4.x      | 0.11.x   | 0.4.x – 0.9.x   | Ethereum support |
| 0.3.x      | 0.9.x    | 0.4.x – 0.9.x   |                  |
