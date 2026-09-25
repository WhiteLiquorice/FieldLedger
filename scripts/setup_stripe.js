const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'stripe_products.json');
const stripeCli = process.env.STRIPE_CLI_PATH || 'stripe';

function runStripe(args) {
  return JSON.parse(execFileSync(stripeCli, args, { encoding: 'utf8', windowsHide: true }));
}

function verify() {
  if (!fs.existsSync(configPath)) throw new Error('stripe_products.json is missing.');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const starter = config.starter;
  if (!starter?.productId || !starter?.priceId || starter.amount !== 4900 || starter.maxTechnicians !== 3) {
    throw new Error('The FieldLedger Starter product configuration is incomplete or inconsistent.');
  }

  const product = runStripe(['products', 'retrieve', starter.productId]);
  const price = runStripe(['prices', 'retrieve', starter.priceId]);
  if (!product.active || !price.active || price.unit_amount !== 4900 || price.recurring?.interval !== 'month') {
    throw new Error('The configured Stripe Starter product or price is inactive or has unexpected billing terms.');
  }

  console.log(JSON.stringify({
    verified: true,
    productId: product.id,
    priceId: price.id,
    amount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring.interval,
  }, null, 2));
  console.log('Set STRIPE_STARTER_PRICE_ID to the verified price ID in the FieldLedger Functions environment.');
}

try {
  verify();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
