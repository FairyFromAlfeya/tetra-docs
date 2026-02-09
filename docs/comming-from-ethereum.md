# Coming from Ethereum to TON

This document explains how TON differs from EVM‑based blockchains and what to keep in mind when moving from Ethereum development to TON

## High‑level differences

- TON uses its own **TVM** virtual machine, not EVM, with a different instruction set, arithmetic model, and storage layout.
- TON is built for horizontal scalability with workchains and dynamically split shards, while Ethereum mainnet today operates as a single execution chain (with rollups built on top).
- TON smart contracts communicate via asynchronous message passing, not synchronous transactions and calls as in typical EVM flows.

## Execution model

On TON, each account is a smart contract (or an empty account) with its own code, data, and balance. Execution is driven by messages, and each handled message produces a transaction that changes the account state.

Key execution properties:

- Asynchronous messages. Contracts do not call each other in a single atomic transaction; instead, they send internal messages that are processed later, forming a message trace tree starting from an external message.
- Message types. There are internal messages (between contracts), incoming external messages (from the outside world), and outgoing external messages (to off‑chain systems).
- Get methods. Read‑only methods run in TVM as separate executions, never commit state, and cannot be called from other contracts, only from off‑chain clients.

By contrast, on Ethereum a transaction can synchronously call multiple contracts within one atomic execution context, and view functions can be invoked by other contracts in the same call tree.

## Network and scalability

TON is designed as a multi‑chain system with dynamic sharding.

- Workchains. Each network (mainnet, testnet) is split into workchains that can have different rules and implementations but freely interoperate.
- Shards. Each workchain is split into shards; the number of shards adjusts dynamically with load, and each shard is an independent blockchain.
- Masterchain. A special workchain (masterchain) keeps TON’s internal metadata; operations there are more expensive to limit load.

Ethereum started as a single L1 chain and scales today primarily via rollups and off‑chain mechanisms, while TON incorporates sharding natively in the base protocol.

## Virtual machine and languages

TON uses TVM, a stack‑based virtual machine tailored for its message‑driven model.

TVM characteristics:

- Arithmetic. TVM supports 64‑bit, 128‑bit, and 256‑bit integers (signed, unsigned, modulo) and specialized operations such as multiply‑then‑shift and shift‑then‑divide for efficient fixed‑point arithmetic.
- Data structures. TVM operates on “cells” linked by references; complex structures are serialized as a Bag of Cells (BoC), with TL‑B schemas describing binary layouts.
- Code format. Smart contracts are deployed as TVM bitcode; currently only codepage 0 is used.

Development stack:

- High‑level: Tolk (recommended), Tact, and TypeScript wrappers are commonly used.
- Intermediate/low‑level: FunC, Fift, and TL‑B for schemas and advanced control over serialization.
- Tooling: Blueprint dev environment, `@ton/core` and `@ton/ton` TypeScript libraries for working with cells, messages, and contracts.

In contrast, Ethereum contracts target EVM bytecode and are mostly written in Solidity or Vyper. TVM is not EVM‑compatible by design, but a separate EVM layer (such as TEVM) can be deployed on top of TON to run EVM bytecode with TON’s performance and fees.

## Accounts, messages, and wallets

TON model:

- Account lifecycle. Each account has a status: `nonexist`, `uninit`, `active`, or `frozen`, depending on whether it has code, balance, and whether storage fees are paid.
- Deployment. Code and initial data are carried in a `StateInit` structure; the account address is derived from the hash of `StateInit` plus workchain ID.
- Wallets. Wallet contracts transform signed external transfer messages into internal messages; they hold a public key and verify signatures off a mnemonic‑derived keypair.

Ethereum model:

- Externally owned accounts (EOAs) and contract accounts are distinct; EOAs are just keypairs with no code, and contracts are deployed via transactions.
- Addresses are derived from sender address and nonce for contracts, or from public keys for EOAs.

Functionally, TON wallets resemble EOAs plus a programmable contract, while typical Ethereum EOAs have no on‑chain logic.

## TON vs EVM: key differences

| Aspect                       | TON (TVM, TON chain)                                                                    | Ethereum / EVM                                                                           |
|-----------------------------|-----------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| Virtual machine             | TVM, stack‑based, supports 64/128/256‑bit arithmetic and rich fixed‑point operations | EVM, stack‑based, primarily 256‑bit arithmetic                                   |
| Execution model             | Asynchronous message passing, each message creates a transaction, multi‑step traces | Synchronous call tree within a single transaction, atomic execution                    |
| Scalability                 | Native workchains and dynamic sharding into multiple blockchains per network | Single base chain; scalability mostly via rollups and L2 solutions              |
| Accounts                    | Any account can hold code, data, and balance; explicit statuses (`nonexist`, `active`, etc.) | EOAs with keys and contracts with code; EOAs have no on‑chain code                     |
| Contract communication      | Internal messages, no direct contract‑to‑contract view calls; get methods are off‑chain only | Direct calls between contracts, including read‑only view calls                         |
| Data model                  | Cell tree structures, BoC serialization, TL‑B schemas for binary layouts          | Flat key–value storage per contract                                                    |
| Languages (native)          | Tolk, FunC, Fift, Tact for TVM contracts                                           | Solidity, Vyper, others for EVM                                                        |
| Tooling / SDKs              | `@ton/core`, `@ton/ton`, Blueprint, explorers aware of TEP standards              | Web3 libraries, JSON‑RPC, EIP‑based tooling                                            |

## Where to read more

For detailed guidance specifically for Ethereum developers, including TVM vs EVM and ecosystem differences, refer to the “Coming from Ethereum” section on the official TON docs: https://docs.ton.org/from-ethereum
