<h2 align="center">Demo for Agoric Wallet Linking with Node.js/Express</h2>

Built on top of [nodejs-ts-google-auth](https://github.com/SamipPoudel58/nodejs-ts-google-oauth)

## 🚀 Local Development

Run the project in your machine locally.

### Step 1: Clone the repository

Clone the repo locally using:

```sh
git clone https://github.com/agoric-labs/agoric-passport-express.git
```

### Step 2: Install Dependencies

Install dependencies in the root folder

```sh
cd agoric-passport-express
npm install
```

### Step 3: Setup Environment Variables

You will need to provide your own `.env` variables, here's how you can do it:

- create a new file `.env` in the root
- open [.env.example](./.env.example)
- copy the contents and paste it into your own `.env` file
- make sure you replace the values with your own valid values

For Google OAuth and MongoDB setup, refer to this [tutorial](https://www.samippoudel.com.np/blog/google_oauth).

### Step 4: Run the server

```sh
npm run dev
```
