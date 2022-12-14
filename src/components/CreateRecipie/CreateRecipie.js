import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import styles from './CreateRecipie.module.css';
import Ingredient from './Ingredient/Ingredient';
import * as recipieService from '../../services/recipieService';
import { useAuthContext } from '../../contexts/AuthContext';

const CreateRecipie = () => {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [ingredients, setIngredients] = useState([]);
    const [ingredientName, setIngredientName] = useState('');
    const [ingredientQuantity, setIngredientQuantity] = useState('');
    const [validateMessageStyle, setValidateMessageStyle] = useState("none");
    const [ingredientValidateMessageStyle, setIngredientValidateMessageStyle] = useState("none");

    useEffect(() => {
        if (user.email === undefined) {
            navigate('/catalog');
        }
    }, [user.email, navigate]);

    const onSubmit = (e) => {
        e.preventDefault();

        const recipieData = Object.fromEntries(new FormData(e.target));
        delete recipieData.ingredientName;
        delete recipieData.ingredientquantity;
        recipieData.ingredients = ingredients;

        if (recipieData.category !== ""
            && recipieData.image !== ""
            && recipieData.neededTime !== ""
            && recipieData.portions !== ""
            && recipieData.preparation !== ""
            && recipieData.preparationTime !== ""
            && recipieData.title !== ""
            && recipieData.ingredients.length > 0) {
            setValidateMessageStyle("none");
            recipieService.create(recipieData)
                .then(result => {
                    navigate(`/catalog/${result._id}`)
                });
        } else {
            setValidateMessageStyle("block");
        }

    };

    const addIngredientHandler = (e) => {
        if(ingredientName !== "" && ingredientQuantity !== ""){
            setIngredientValidateMessageStyle("none")
            const newIngredient = { 'name': ingredientName, 'quantity': ingredientQuantity };
            setIngredients(ingredients => [...ingredients, newIngredient])
            setIngredientName('');
            setIngredientQuantity('');
        } else{
            setIngredientValidateMessageStyle("block")
        }

        
    }

    const onCahngeIngredientsName = (e) => {
        setIngredientName(e.target.value);
    }

    const onCahngeIngredientsQuantity = (e) => {
        setIngredientQuantity(e.target.value);
    }

    const onClickRemoveIngredientHandler = (ingredientsName) => {
        setIngredients(ingredients.filter(x => x.name !== ingredientsName))
    }

    return (

        <div className={styles.home}>
            <section id="create-page" className={styles.createPage}>
                <h1>???????????? ??????????????</h1>
                <p style={{ display: validateMessageStyle }}>???????????? ???????????? ???????????? ???? ?????????? ??????????????????!!!</p>
                <form id="create" onSubmit={onSubmit}>
                    <div className={styles.container}>

                        <div>
                            <label htmlFor="leg-title">?????? ???? ??????????????????</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                placeholder="???????????????? ??????..."
                            />
                        </div>
                        <div>
                            <label htmlFor="category">??????????????????</label>
                            <input
                                type="text"
                                id="category"
                                name="category"
                                placeholder="???????????????? ??????????????????..."
                            />
                        </div>

                        <div>
                            <label htmlFor="preparationTime">?????????? ???? ????????????????????</label>
                            <input
                                type="text"
                                id="preparationTime"
                                name="preparationTime"
                                placeholder="???????????????? ????????????..."
                            />
                        </div>

                        <div>
                            <label htmlFor="neededTime">?????????? ???? ????????????????????</label>
                            <input
                                type="text"
                                id="neededTime"
                                name="neededTime"
                                placeholder="???????????????? ????????????..."
                            />
                        </div>

                        <div>
                            <label htmlFor="portions">???????? ????????????</label>
                            <input
                                type="number"
                                id="portions"
                                name="portions"
                                min={1}
                                placeholder={1}
                            />
                        </div>

                        <div>
                            <label htmlFor="image">????????????</label>
                            <input
                                type="text"
                                id="image"
                                name="image"
                                placeholder="???????????? ????????????..."
                            />
                        </div>
                        <div id={styles.ingredientsWrapper}>
                        <p style={{ display: ingredientValidateMessageStyle }}>???????????????????? ???????????? ???? ???????? ?????????????????? ?????? ?? ????????????????????</p>
                            <div id={styles.newIngredients}>
                                <label htmlFor="ingredient">???????????? ????????????????</label>
                                <div className={styles.ingredient}>
                                    <input
                                        type="text"
                                        id="ingredient"
                                        name="ingredientName"
                                        placeholder="??????..."
                                        value={ingredientName}
                                        onChange={onCahngeIngredientsName}
                                    />
                                    <input
                                        type="text"
                                        id="ingredient"
                                        name="ingredientquantity"
                                        placeholder="????????????????????..."
                                        value={ingredientQuantity}
                                        onChange={onCahngeIngredientsQuantity}
                                    />
                                    <button type='button' onClick={addIngredientHandler} >????????????</button>
                                </div>
                            </div>
                            <div id={styles.ingredients}>
                                <div>????????????????</div>
                                <div className={styles.ingredientsItemList}>
                                    {ingredients.length > 0
                                        ? ingredients.map(x =>
                                            <Ingredient
                                                key={x.name}
                                                ingredient={x}
                                                onClick={onClickRemoveIngredientHandler}
                                            />)
                                        : <h6 className={styles.noArticles}>???????? ???????????????? ????????????????</h6>
                                    }
                                </div>

                            </div>
                        </div>

                        <div id={styles.preparation}>
                            <label htmlFor="preparation">?????????? ???? ????????????????????</label>
                            <textarea name="preparation" id="summary" defaultValue={""} placeholder="???????????????? ?????????? ???? ????????????????????..." />
                        </div>


                        <input
                            className={styles.btnSubmit}
                            type="submit"
                            value="???????????? ??????????????????"
                        />
                    </div>
                </form>
            </section>
        </div>

    );
};

export default CreateRecipie;