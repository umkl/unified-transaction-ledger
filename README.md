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

## Dev Setup

Run this command to setup the CLI

```
pnpm link
```