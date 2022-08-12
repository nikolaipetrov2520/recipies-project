import { useContext } from "react";
import { useNavigate, Link } from "react-router-dom";

import styles from './Login.module.css';

import { AuthContext } from "../../contexts/AuthContext";
import * as authService from "../../services/authService";

const Login = () => {
    const { userLogin } = useContext(AuthContext);
    const navigate = useNavigate();

    const onSubmit = (e) => {
        e.preventDefault();

        const {
            email,
            password,
        } = Object.fromEntries(new FormData(e.target));

        authService.login(email, password)
            .then(authData => {
                userLogin(authData);
                navigate('/');
            })
            .catch(() => {
                navigate('/404');
            });
    };

    return (
        <section className={styles.auth}>
            <form id="login" onSubmit={onSubmit}>
                <div className={styles.container}>
                    <h1>Вход</h1>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Sokka@gmail.com"
                    />
                    <label htmlFor="login-pass">Парола:</label>
                    <input type="password" id="login-password" name="password" />
                    <input type="submit" className={styles.btnSubmit} value="Вход" />
                    <p className={styles.field}>
                        <span>
                            Ако все още намате профил кликнете <Link to="/register">тук</Link>
                        </span>
                    </p>
                </div>
            </form>
        </section>
    );
}

export default Login;