import { useNavigate, Link } from 'react-router-dom';

import styles from './Register.module.css';

import * as authService from "../../services/authService";
import { withAuth } from "../../contexts/AuthContext";


const Register = ({ auth }) => {
    const navigate = useNavigate();

    const onSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);

        const email = formData.get('email');
        const username = formData.get('username');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');

        if (password !== confirmPassword) {
            return;
        }

        authService.register(email, password, username)
            .then(authData => {
                auth.userLogin(authData);
                navigate('/');
            });
    }

    return (
        <section id="register-page" className={styles.auth}>
            <form id="register" onSubmit={onSubmit}>
                <div className={styles.container}>
                    <h1>Регистрация</h1>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="maria@email.com"
                    />
                    <label htmlFor="username">Потребителско име:</label>
                    <input
                        type="username"
                        id="username"
                        name="username"
                        placeholder="maria"
                    />
                    <label htmlFor="pass">Парола:</label>
                    <input type="password" name="password" id="register-password" />
                    <label htmlFor="con-pass">Потвърдете паролата:</label>
                    <input type="password" name="confirm-password" id="confirm-password" />
                    <input className={styles.btnSubmit} type="submit" value="Регистрация" />
                    <p className={styles.field}>
                        <span>
                            Ако вече имате регистрация кликнете <Link to="/login">hтук</Link>
                        </span>
                    </p>
                </div>
            </form>
        </section>
    );
};


const RegisterWithAuth = withAuth(Register);

export default RegisterWithAuth;
