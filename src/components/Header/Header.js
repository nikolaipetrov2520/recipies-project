import styles from './Header.module.css'
import { Link } from 'react-router-dom';

import Search from '../Search/Search';

import { useAuthContext } from '../../contexts/AuthContext';

const Header = () => {
    const { user } = useAuthContext();

    return (
        <header>
            <h1 className={styles.logo}>
                <img src='/logo.png' alt='logo' width={"60px"}/>
                <Link className={styles.logo} to="/">
                    Рецепти
                </Link>
            </h1>
            <Search />
            <div className={styles.username}>
                    {user.email && <span className={styles.username}>{user.email}</span>}
                </div>
            <nav>
                <Link to="/catalog">Всички рецепти</Link>
                {user.email
                    ? <div id="user">
                        <Link to="/create">Нова рецепта</Link>
                        <Link to="/logout">Logout</Link>
                    </div>
                    : <div id="guest">
                        <Link to="/login">Login</Link>
                        <Link to="/register">Register</Link>
                    </div>
                }
            </nav>
        </header>
    );
};

export default Header;
