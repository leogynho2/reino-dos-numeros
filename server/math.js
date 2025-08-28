class MathQuestionGenerator {
    constructor() {
        this.questions = [
            {
                id: "frac_add_1",
                difficulty: "easy",
                template: () => {
                    const a = Math.floor(Math.random() * 5) + 1;
                    const b = Math.floor(Math.random() * 5) + 1;
                    const c = Math.floor(Math.random() * 5) + 1;
                    const d = Math.floor(Math.random() * 5) + 1;
                    return {
                        prompt: `Some ${a}/${b} + ${c}/${d}`,
                        solution: (a/b + c/d).toFixed(2),
                        explanation: `Para somar frações, encontre um denominador comum. ${a}/${b} + ${c}/${d} = ${(a*d + c*b)}/${(b*d)} = ${(a/b + c/d).toFixed(2)}`
                    };
                }
            },
            {
                id: "frac_sub_1",
                difficulty: "easy",
                template: () => {
                    const a = Math.floor(Math.random() * 5) + 1;
                    const b = Math.floor(Math.random() * 5) + 1;
                    const c = Math.floor(Math.random() * 5) + 1;
                    const d = Math.floor(Math.random() * 5) + 1;
                    return {
                        prompt: `Subtraia ${a}/${b} - ${c}/${d}`,
                        solution: (a/b - c/d).toFixed(2),
                        explanation: `Para subtrair frações, encontre um denominador comum. ${a}/${b} - ${c}/${d} = ${(a*d - c*b)}/${(b*d)} = ${(a/b - c/d).toFixed(2)}`
                    };
                }
            },
            {
                id: "linear_eq_1",
                difficulty: "normal",
                template: () => {
                    const a = Math.floor(Math.random() * 5) + 1;
                    const b = Math.floor(Math.random() * 10) + 1;
                    const c = Math.floor(Math.random() * 5) + 1;
                    const d = Math.floor(Math.random() * 10) + 1;
                    // ax + b = cx + d
                    const solution = ((d - b) / (a - c)).toFixed(2);
                    return {
                        prompt: `Resolva para x: ${a}x + ${b} = ${c}x + ${d}`,
                        solution: solution,
                        explanation: `Subtraia ${c}x de ambos os lados: ${a-c}x + ${b} = ${d}. Subtraia ${b}: ${a-c}x = ${d-b}. Divida por ${a-c}: x = ${solution}`
                    };
                }
            },
            {
                id: "percentage_1",
                difficulty: "normal",
                template: () => {
                    const percent = Math.floor(Math.random() * 50) + 10;
                    const number = Math.floor(Math.random() * 100) + 50;
                    const result = (number * percent / 100).toFixed(2);
                    return {
                        prompt: `Quanto é ${percent}% de ${number}?`,
                        solution: result,
                        explanation: `Para calcular porcentagem, multiplique o número pela porcentagem e divida por 100. ${number} × ${percent} / 100 = ${result}`
                    };
                }
            },
            {
                id: "power_1",
                difficulty: "normal",
                template: () => {
                    const base = Math.floor(Math.random() * 5) + 2;
                    const exponent = Math.floor(Math.random() * 3) + 2;
                    return {
                        prompt: `Calcule ${base}^${exponent}`,
                        solution: Math.pow(base, exponent).toString(),
                        explanation: `${base} elevado a ${exponent} significa multiplicar ${base} por si mesmo ${exponent} vezes. ${base} × ${base} = ${Math.pow(base, exponent)}`
                    };
                }
            },
            {
                id: "square_root_1",
                difficulty: "normal",
                template: () => {
                    const num = Math.floor(Math.random() * 10) + 1;
                    const square = num * num;
                    return {
                        prompt: `Qual é a raiz quadrada de ${square}?`,
                        solution: num.toString(),
                        explanation: `A raiz quadrada de ${square} é ${num} porque ${num} × ${num} = ${square}`
                    };
                }
            },
            {
                id: "mmc_1",
                difficulty: "hard",
                template: () => {
                    const a = Math.floor(Math.random() * 10) + 2;
                    const b = Math.floor(Math.random() * 10) + 2;
                    
                    // Função para calcular MMC
                    const mmc = (x, y) => {
                        let maior = Math.max(x, y);
                        while(true) {
                            if(maior % x === 0 && maior % y === 0) {
                                return maior;
                            }
                            maior++;
                        }
                    };
                    
                    const result = mmc(a, b);
                    return {
                        prompt: `Qual é o MMC de ${a} e ${b}?`,
                        solution: result.toString(),
                        explanation: `O Mínimo Múltiplo Comum (MMC) de ${a} e ${b} é ${result}`
                    };
                }
            },
            {
                id: "proportion_1",
                difficulty: "hard",
                template: () => {
                    const a = Math.floor(Math.random() * 5) + 1;
                    const b = Math.floor(Math.random() * 5) + 1;
                    const c = Math.floor(Math.random() * 5) + 1;
                    // a/b = c/x → x = (b*c)/a
                    const x = (b * c / a).toFixed(2);
                    return {
                        prompt: `Resolva a proporção: ${a}/${b} = ${c}/x`,
                        solution: x,
                        explanation: `Para resolver a proporção, use a regra de três: ${a} × x = ${b} × ${c} → x = ${b * c} / ${a} = ${x}`
                    };
                }
            }
        ];
    }

    getQuestion(difficulty = "normal") {
        // Filtrar perguntas pela dificuldade
        let filteredQuestions = this.questions;
        if (difficulty !== "all") {
            filteredQuestions = this.questions.filter(q => q.difficulty === difficulty);
        }
        
        // Selecionar uma pergunta aleatória
        const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
        const questionTemplate = filteredQuestions[randomIndex];
        
        // Gerar a pergunta
        return questionTemplate.template();
    }

    validateAnswer(question, answer) {
        // Converter para número para comparação
        const expected = parseFloat(question.solution);
        const provided = parseFloat(answer);
        
        // Permitir pequena margem de erro para questões decimais
        if (!isNaN(expected) && !isNaN(provided)) {
            return Math.abs(expected - provided) < 0.01;
        }
        
        // Comparação exata para respostas textuais
        return question.solution.toString().toLowerCase() === answer.toString().toLowerCase();
    }
}

module.exports = MathQuestionGenerator;