import { Routes, Route } from 'react-router-dom';

import './App.module.css'

import { AuthProvider } from './contexts/AuthContext';
import { SearchContext } from './contexts/SearchContext';
import { useState } from 'react';

import Home from './components/Home/Home'
import Login from './components/Login/Login';
import Logout from './components/Logout/Logout';
import Register from './components/Register/Register';
import Favorites from './components/Favorites/Favorites';
import MyRecipies from './components/MyRecipies/MyRecipies';
import MyComments from './components/MyComments/MyComments';
import CreateRecipie from './components/CreateRecipie/CreateRecipie';
import EditRecipie from './components/EditRecipie/EditRecipie';
import Header from './components/Header/Header';
import Catalog from './components/Catalog/Catalog';
import Footer from './components/Footer/Footer';
import ErrorPage from './components/ErrorPage/ErrorPage'
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
              <Route path="/register" element={<Register />} />
              <Route path="/create" element={(<CreateRecipie />)} />
              <Route path="/user/favorites" element={(<Favorites />)} />
              <Route path="/user/myRecipies" element={(<MyRecipies />)} />
              <Route path="/user/myComments" element={(<MyComments />)} />
              <Route path="/recipie/:recipieId/edit" element={<EditRecipie />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/catalog/?page" element={<Catalog />} />
              <Route path="/catalog/:recipieId" element={<RecipieDetails />} />
              <Route path="*" element={<ErrorPage />} />
              <Route path="/404" element={<ErrorPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </SearchContext.Provider>
    </AuthProvider>

  );
}

export default App;
