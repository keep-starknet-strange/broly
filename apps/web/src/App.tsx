import { useState } from 'react'
import { Routes, Route } from 'react-router'
import './App.css'
import Header from './components/Header'

import Home from './pages/Home'
import Inscriptions from './pages/Inscriptions'
import Collection from './pages/Collection'
import Info from './pages/Info'
import Inscription from './pages/Inscription'
import Request from './pages/Request'

function App() {
  const [tabs, _setTabs] = useState([
    { name: 'Home', path: '/', component: Home },
    { name: 'Inscriptions', path: '/inscriptions', component: Inscriptions },
    { name: 'Collection', path: '/collection', component: Collection },
    { name: 'Info', path: '/info', component: Info },
  ])

  // TODO: <Route path="*" element={<NotFound />} />
  return (
    <div className="h-screen relative">
      <Header tabs={tabs} />
      <div className="h-[4.5rem]" />
      <Routes>
        {tabs.map((tab) => (
          <Route key={tab.path} path={tab.path} element={<tab.component />} />
        ))}
        <Route path="/inscription/:id" element={<Inscription />} />
        <Route path="/request/:id" element={<Request />} />
      </Routes>
    </div>
  )
}

export default App;
