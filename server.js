const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(express.static('public'));

// Sample product database
const products = [
    { id: 1, name: "TVM Nametag", price: 10.00, description: "Get your customized TVM Nametag displayed instantly in-game to stand out from the crowd.", stock: 14, image: "/logo.png" },
    { id: 2, name: "TVM Nametag Change", price: 3.00, description: "Need a fresh look? Use a TVM Nametag Change token to update your display title or design.", stock: 17, image: "/logo.png" }
];

app.get('/api/products', (req, res) => {
    res.json(products);
});

// Direct link route to handle Stripe session creation and instant redirect
app.get('/buy/:id', async (req, res) => {
    try {
        const product = products.find(p => p.id == req.params.id) || products[0];

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: product.name },
                    unit_amount: Math.round(product.price * 100),
                },
                quantity: 1,
            }],
            success_url: `${req.protocol}://${req.get('host')}/?success=true`,
            cancel_url: `${req.protocol}://${req.get('host')}/product.html?id=${product.id}`,
        });

        res.redirect(session.url);
    } catch (err) {
        console.error("Stripe Checkout Error:", err);
        res.status(500).send("Error initiating checkout: " + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
