import { Routes, Route } from 'react-router-dom';
import { Suspense } from "react";

import './App.module.css'

import { AuthProvider } from './contexts/AuthContext';
import { SearchContext } from './contexts/SearchContext';
import { useState } from 'react';

import Home from './components/Home/Home'
import Login from './components/Login/Login';
import Logout from './components/Logout/Logout';
import Register from './components/Register/Register'
import Header from './components/Header/Header';
import Catalog from './components/Catalog/Catalog';
import Footer from './components/Footer/Footer';
import RecipieDetails from './components/RecipieDetails/RecipieDetails';

import './App.css';


function App() {

  const [search, setSearch] = useState("");

  return (
    <AuthProvider>
      <SearchContext.Provider value={{ search, setSearch }}>
        <div className="App">
          <Header />
          <main id="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={
                <Suspense fallback={<span>Loading....</span>}>
                  <Register />
                </Suspense>
              } />
              {/* <Route path="/create" element={(
                <PrivateRoute>
                  <CreateGame />
                </PrivateRoute>
              )} /> */}
              {/* <Route element={<PrivateGuard />}> */}
              {/* <Route path="/games/:gameId/edit" element={<EditGame />} /> */}
              <Route path="/logout" element={<Logout />} />
              {/* </Route> */}
              <Route path="/catalog" element={
                <Suspense fallback={<span>Loading....</span>}>
                  <Catalog />
                </Suspense>
              } />
              <Route path="/catalog/:recipieId" element={
                <Suspense fallback={<span>Loading....</span>}>
                  <RecipieDetails />
                </Suspense>
              } />
            </Routes>
          </main>
          <Footer />
        </div>
      </SearchContext.Provider>
    </AuthProvider>

  );
}

export default App;
