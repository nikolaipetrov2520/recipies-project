import { Routes, Route } from 'react-router-dom';

import './App.module.css'

import { AuthProvider } from './contexts/AuthContext';
import { RecipiesProvider } from './contexts/RecipiesContext';

import Header from './components/Header/Header';
import Catalog from './components/Catalog/Catalog';
import Footer from './components/Footer/Footer'

import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Header />
        <RecipiesProvider>
          <main id="main-content">
            <Routes>
              {/* <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={
                                <Suspense fallback={<span>Loading....</span>}>
                                    <Register />
                                </Suspense>
                            } />
                            <Route path="/create" element={(
                                <PrivateRoute>
                                    <CreateGame />
                                </PrivateRoute>
                            )} />
                            <Route element={<PrivateGuard />}>
                                <Route path="/games/:gameId/edit" element={<EditGame />} />
                                <Route path="/logout" element={<Logout />} />
                            </Route> */}
              <Route path="/catalog" element={<Catalog />} />
              {/* <Route path="/catalog/:gameId" element={<GameDetails />} /> */}
            </Routes>
          </main>
        </RecipiesProvider>
        <Footer />
      </div>
    </AuthProvider>

  );
}

export default App;
