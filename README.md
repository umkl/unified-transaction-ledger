# Purpose

Aggregating transactions from various open bank apis into one spreadsheet using Nordigen (now GoCardless).

## Walkthrough

### 1. Setup your GoCardless Account

Go to [this Dashboard](https://bankaccountdata.gocardless.com/) and create an account.

Then execute this command:

```
utl setup
```

### 2. Provide User Secrets

Retrieve Secrets from [this Page](https://bankaccountdata.gocardless.com/user-secrets/) and enter them when prompted.

### 3. Grant data retrieval

Grant access using the OAuth2 Process from the selected bank.

### 4. Create spreadsheet

```
utl spreadsheet
```

## Dev

Run this command to setup the CLI

```
pnpm link
```

### Process

A requisition is created using an institution id. The requisition supplies an account id after verification. Essentially a single requisition can be used for multiple users of the same bank account.

The requisitions are managed using the RequisitionFile class - using it new requisitions can be made and verified using a temporary web server.

The transactions are managed using the TransactionCacheDocuments class - this class holds all transactions and reads them initially by using the create factory.

### Example

The user wants to fetch all the transactions from the past 30 days -> use the `setup` command to get an according `access token` -> use `pull` to load the transactions into a response file and a transactions file -> use `spreadsheet` to generate an spreasheet with all transactions in that time frame.

## Balance

creates snapshots and stores them into a daily snapshot file

### daily snapshot

- date: Date
- balances: BankBalance[]
- totalBalance: number;

### bank balance

- bankId
- balance
- currency

## Balance Export

Creates a csv spreadsheet with all bank account balances grouped by date sorted ascendantly with the following columns:

- date as string (DD-MM-YY)
- Trade Republic Cash
- Trade Republic Portfolio
- Flatex Cash
- Flatex Portfolio
- Raiffeisen Cash
- Revolut Cash
- N26 Business Cash

## Budgets

! not implemented yet

budget entity looks like this:

amount
bank account

you can push money into an budget manually and later on see how an account is divided up.

for instance there is a trade republic cash account with 1000 on it then you can execute

budget stocks --account trade_republic_cash 400

then when i do budget stocks

i see

trade_republic cash
stocks: 400
rest: 600
