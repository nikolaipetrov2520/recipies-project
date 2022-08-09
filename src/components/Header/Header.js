import styles from './Header.module.css'
import { Link } from 'react-router-dom';

import Search from '../Search/Search';

import { useAuthContext } from '../../contexts/AuthContext';
import { useState } from 'react';

const Header = () => {
    const { user } = useAuthContext();

    const [nemuButton, setNemuButton] = useState("open");
    const [open, setOpen] = useState("block");
    const [close, setClose] = useState("none");
    const [navClass, setNavClass] = useState(styles.navClose);

    const menuClickHandler = () => {
        if (nemuButton === "open") {
            setNemuButton("close");
            setOpen("none");
            setClose("block");
            setNavClass(styles.navOpen);
        } else if(nemuButton === "close") {
            setNemuButton("open");
            setOpen("block");
            setClose("none");
            setNavClass(styles.navClose);
        }
    };

    return (
        <header>
            <h1 className={styles.logo}>
                <img src='/logo.png' alt='logo' width={"60px"} />
                <Link className={styles.logo} to="/">
                    Рецепти
                </Link>
            </h1>
            <Search menu={nemuButton} />
            <div className={styles.username}>
                {user.email && <span className={styles.username}>
                <Link to="/user/favorites">{user.email}</Link>
                   </span>}
            </div>
            <nav className={navClass}>
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
            <div className={styles.menuButton} onClick={menuClickHandler}>
                <div className={styles.open} style={{display : open}}>|||</div>
                <div className={styles.close}  style={{display : close}}>X</div>
                
                </div>
        </header>
    );
};

export default Header;
