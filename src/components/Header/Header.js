import styles from './Header.module.css'
import { Link } from 'react-router-dom';

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
            <div className={styles.search}>
                <label htmlFor='search' className={styles.searchLabel}><img /></label>
                <input type="text" id='search' className={styles.searchInput}></input>
            </div>
            <nav>
                {user.email && <span>{user.email}</span>}
                <Link to="/catalog">Всички рецепти</Link>
                {user.email
                    ? <div id="user">
                        <Link to="/create">Създаване на рецепта</Link>
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
