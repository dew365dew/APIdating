import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)


// ==========================
// 🔐 MIDDLEWARE (สำคัญมาก)
// ==========================
const getUser = async (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) return null

  const { data, error } = await supabase.auth.getUser(token)

  if (error) return null

  return data.user
}


// ==========================
// 📌 TEST
// ==========================
app.get('/', (req, res) => {
  res.send('API RUNNING')
})


app.post('/register', async (req, res) => {
  const { email, password, phone, name, province } = req.body

  // สมัคร auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })

  if (error) {
    return res.status(400).json(error)
  }

  // สร้าง profile
  const { error: profileError } = await supabase
    .from('users')
    .insert([{
      id: data.user.id,
      phone,
      name,
      province
    }])

  if (profileError) {
    return res.status(400).json(profileError)
  }

  res.json({
    message: 'register success',
    user: data.user
  })
})

 // login   email, password  A
app.post('/login', async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return res.status(400).json(error)
  }

  res.json(data)
})

// ==========================
// 👤 CREATE USER PROFILE
// ==========================
app.post('/users', async (req, res) => {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { phone, name, province } = req.body

  const { data, error } = await supabase
    .from('users')
    .insert([{
      id: user.id,
      phone,
      name,
      province
    }])

  if (error) return res.status(400).json(error)

  res.json(data)
})


// ==========================
// 🔍 GET USERS (feed)
// ==========================
app.get('/users', async (req, res) => {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { province } = req.query

  let query = supabase.from('users').select('*')

  if (province) {
    query = query.eq('province', province)
  }

  // ❗ ตัดตัวเองออก
  query = query.neq('id', user.id)

  const { data, error } = await query

  if (error) return res.status(400).json(error)

  res.json(data)
})





// ==========================
// 👉 SWIPE
// ==========================
app.post('/swipe', async (req, res) => {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { target_user_id, action } = req.body

  const { data, error } = await supabase
    .from('swipes')
    .insert([{
      user_id: user.id,
      target_user_id,
      action
    }])

  if (error) return res.status(400).json(error)

  res.json(data)
})


// ==========================
// ❤️ MATCHES
// ==========================
app.get('/matches', async (req, res) => {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

  if (error) return res.status(400).json(error)

  res.json(data)
})


// ==========================
// 💬 SEND MESSAGE
// ==========================
app.post('/message', async (req, res) => {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { match_id, message } = req.body

  const { data, error } = await supabase
    .from('messages')
    .insert([{
      match_id,
      sender_id: user.id,
      message
    }])

  if (error) return res.status(400).json(error)

  res.json(data)
})


// ==========================
// 💬 GET MESSAGES
// ==========================
app.get('/messages/:match_id', async (req, res) => {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { match_id } = req.params

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', match_id)
    .order('created_at', { ascending: true })

  if (error) return res.status(400).json(error)

  res.json(data)
})


// ==========================
// 🚀 START
// ==========================
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
