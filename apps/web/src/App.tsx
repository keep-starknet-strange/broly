import { useState } from 'react'
import { Routes, Route } from 'react-router'
import './App.css'
import Header from './components/Header'

import Home from './pages/Home'
import Inscriptions from './pages/Inscriptions'
import Collection from './pages/Collection'
import Info from './pages/Info'

function App() {
  const [tabs, _setTabs] = useState([
    { name: 'Home', path: '/', component: Home },
    { name: 'Inscriptions', path: '/inscriptions', component: Inscriptions },
    { name: 'Collection', path: '/collection', component: Collection },
    { name: 'Info', path: '/info', component: Info },
  ])

  return (
    <div className="h-screen">
      <Header tabs={tabs} />
      <Routes>
        {tabs.map((tab) => (
          <Route key={tab.path} path={tab.path} element={<tab.component />} />
        ))}
      </Routes>
    </div>
  )
}

export default App
