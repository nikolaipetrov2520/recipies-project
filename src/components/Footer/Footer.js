import './Footer.module.css';

const Footer = () => {
    return (
        <footer>
            <h3>
                © 2022 <span>Приложение за рецепти</span>
            </h3>
            <div>
                <i className="fa-brands fa-facebook"></i>
                <i className="fa-brands fa-instagram"></i>
                <i className="fa-brands fa-youtube"></i>
            </div>
        </footer>
    );
};

export default Footer;