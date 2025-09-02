import random
from flask import Blueprint, jsonify, session

captcha_bp = Blueprint('captcha_bp', __name__)

@captcha_bp.route('/api/captcha', methods=['GET'])
def get_captcha():
    num1 = random.randint(1, 10)
    num2 = random.randint(1, 10)
    operator = random.choice(['+', '-', '*'])

    if operator == '+':
        answer = num1 + num2
        question = f"{num1} + {num2} = ?"
    elif operator == '-':
        # Ensure the result is not negative
        if num1 < num2:
            num1, num2 = num2, num1
        answer = num1 - num2
        question = f"{num1} - {num2} = ?"
    else: # operator == '*'
        answer = num1 * num2
        question = f"{num1} * {num2} = ?"

    # Store the answer in the server-side session
    session['captcha_answer'] = answer

    return jsonify({'question': question})
