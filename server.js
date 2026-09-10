const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 3000;

// Database of TVM products
const products = [
    {
        id: 1,
        name: "TVM Nametag",
        price: 10.00,
        stock: 14,
        description: "Get your customized TVM Nametag displayed instantly in-game to stand out from the crowd."
    },
    {
        id: 2,
        name: "TVM Nametag Change",
        price: 3.00,
        stock: 17,
        description: "Need a fresh look? Use a TVM Nametag Change token to update your display title or design."
    }
];

// Forcefully block any requests trying to hit old cached checkouts
app.get('/checkout.html', (req, res) => {
    res.redirect('/');
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API route to fetch products
app.get('/api/products', (req, res) => {
    res.json(products);
});

app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
});

// JSON API Checkout Session endpoint
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const product = products.find(p => p.id === parseInt(productId));

        if (!product) {
            return res.status(400).json({ error: "Invalid product selected." });
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: product.name,
                            description: product.description,
                        },
                        unit_amount: Math.round(product.price * 100),
                    },
                    quantity: quantity || 1,
                },
            ],
            mode: 'payment',
            managed_payments: { enabled: false },
            success_url: `${protocol}://${host}/success.html`,
            cancel_url: `${protocol}://${host}/product.html?id=${productId}`,
        });

        res.json({ url: session.url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Direct Redirect Route
app.get('/buy/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const product = products.find(p => p.id === productId);
        if (!product) return res.status(404).send("Product not found");

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');

        const session = await stripe.checkout.sessions.create({
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: product.name, description: product.description },
                    unit_amount: Math.round(product.price * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            managed_payments: { enabled: false },
            success_url: `${protocol}://${host}/success.html`,
            cancel_url: `${protocol}://${host}/product.html?id=${productId}`,
        });

        res.redirect(303, session.url);
    } catch (e) {
        res.status(500).send("Stripe Error: " + e.message);
    }
});

app.listen(PORT, () => {
    console.log(`TVM Store backend running at http://localhost:${PORT}`);
});