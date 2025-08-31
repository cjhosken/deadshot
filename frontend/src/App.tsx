import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'


// We set a base API for the python backend.
const API_BASE_URL = 'http://localhost:8000'

function App() {
  const [items, setItems] = useState<string[]>([])
  const [newItem, setNewItem] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/items`)
      setItems(response.data.items)
    } catch (error) {
      console.error('Error fetching items:', error)
      setMessage('Failed to fetch items')
    }
  }

  const addItem = async () => {
    if (!newItem.trim()) return
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/items`, { 
        name: newItem,
        timestamp: new Date().toISOString()
      })
      setMessage(response.data.message)
      setNewItem('')
      fetchItems() // Refresh the list
    } catch (error) {
      console.error('Error adding item:', error)
      setMessage('Failed to add item')
    }
  }

  return (
    <div className="App">
      <h1>Cross-Platform App</h1>
      <div className="card">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Enter new item"
        />
        <button onClick={addItem}>
          Add Item
        </button>
        
        <h2>Items from Python Backend:</h2>
        <ul>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        
        {message && <p>{message}</p>}
      </div>
    </div>
  )
}

export default App