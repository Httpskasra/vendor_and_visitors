const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 5001

app.use(cors())
app.use(express.json())

let products = [
  {
    id: 1,
    title: 'iPhone 15 Pro',
    price: 999,
    category: 'Phone',
    description: 'Apple flagship smartphone with powerful camera and performance.',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600',
    stock: 8,
  },
  {
    id: 2,
    title: 'MacBook Air M2',
    price: 1199,
    category: 'Laptop',
    description: 'Lightweight laptop for students, developers and creators.',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
    stock: 5,
  },
  {
    id: 3,
    title: 'Samsung Galaxy S24',
    price: 899,
    category: 'Phone',
    description: 'Android smartphone with excellent display and AI features.',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600',
    stock: 12,
  },
  {
    id: 4,
    title: 'Sony Headphones',
    price: 249,
    category: 'Audio',
    description: 'Noise cancelling wireless headphones for music and work.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    stock: 3,
  },
  {
    id: 5,
    title: 'Gaming Keyboard',
    price: 129,
    category: 'Accessories',
    description: 'Mechanical RGB keyboard for gaming and productivity.',
    image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600',
    stock: 15,
  },
]

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Mini E-Commerce API is running',
    endpoints: {
      products: '/products',
      singleProduct: '/products/:id',
    },
  })
})

// GET all products + search
// GET all products + search + category filter
app.get('/products', (req, res) => {
  const { search, category } = req.query

  let result = [...products]

  // Search by title, category, description
  if (search && search.trim() !== '') {
    const keyword = search.toLowerCase().trim()

    result = result.filter((product) => {
      const title = product.title?.toLowerCase() || ''
      const category = product.category?.toLowerCase() || ''
      const description = product.description?.toLowerCase() || ''

      return (
        title.includes(keyword) ||
        category.includes(keyword) ||
        description.includes(keyword)
      )
    })
  }

  // Optional category filter
  if (category && category.trim() !== '') {
    const selectedCategory = category.toLowerCase().trim()

    result = result.filter((product) => {
      return product.category?.toLowerCase() === selectedCategory
    })
  }

  res.json(result)
})

// GET product by id
app.get('/products/:id', (req, res) => {
  const id = Number(req.params.id)

  const product = products.find((item) => item.id === id)

  if (!product) {
    return res.status(404).json({
      message: 'Product not found',
    })
  }

  res.json(product)
})

// POST create product
app.post('/products', (req, res) => {
  const { title, price, category, description, image, stock } = req.body

  if (!title || !price || !category) {
    return res.status(400).json({
      message: 'Title, price and category are required',
    })
  }

  const newProduct = {
    id: Date.now(),
    title,
    price: Number(price),
    category,
    description: description || '',
    image: image || 'https://via.placeholder.com/600x400?text=Product',
    stock: Number(stock) || 0,
  }

  products.push(newProduct)

  res.status(201).json(newProduct)
})

// PATCH update product
app.patch('/products/:id', (req, res) => {
  const id = Number(req.params.id)

  const productIndex = products.findIndex((item) => item.id === id)

  if (productIndex === -1) {
    return res.status(404).json({
      message: 'Product not found',
    })
  }

  const updatedProduct = {
    ...products[productIndex],
    ...req.body,
    price:
      req.body.price !== undefined
        ? Number(req.body.price)
        : products[productIndex].price,
    stock:
      req.body.stock !== undefined
        ? Number(req.body.stock)
        : products[productIndex].stock,
  }

  products[productIndex] = updatedProduct

  res.json(updatedProduct)
})

// DELETE product
app.delete('/products/:id', (req, res) => {
  const id = Number(req.params.id)

  const product = products.find((item) => item.id === id)

  if (!product) {
    return res.status(404).json({
      message: 'Product not found',
    })
  }

  products = products.filter((item) => item.id !== id)

  res.json({
    message: 'Product deleted successfully',
    deletedProduct: product,
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server is running on http://localhost:${PORT}`)
  console.log(`For other computers use: http://YOUR_IP_ADDRESS:${PORT}`)
})