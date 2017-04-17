const {createBot, matches} = require('../bot-api');

const createTodoBot = name => {
    const todos = {};
    const bot = createBot(name);
    const {whenOneToOne, respondWith} = bot;

    const printTodos = todosForUser => todosForUser.map((todo, idx) => `${idx + 1}. ${todo}`).join(',\n');

    bot.on(
        'message',
        matches({
            '/todos': respondWith(({sender}) => {
                const todosForUser = todos[sender];
                if (todosForUser) {
                    return 'These are your todos: \n' + printTodos(todosForUser);
                } else {
                    return "You don't have pending todos!";
                }
            }),

            '/todo': respondWith(({sender}, newTodo) => {
                const todosForUser = todos[sender] || [];
                todos[sender] = [...todosForUser, newTodo];
                return `New todo saved: "${newTodo}" \nPending: \n${printTodos(todos[sender])}`;
            }),

            '/done': respondWith(({sender}, idx) => {
                const doneTodoIdx = parseInt(idx) - 1;
                const todosForUser = todos[sender] || [];
                const doneTodo = todosForUser[doneTodoIdx];
                const pendingTodos = todosForUser.filter((todo, idx) => idx !== doneTodoIdx);
                todos[sender] = pendingTodos;
                return doneTodo
                    ? `"${doneTodo}" marked as done \nPending: \n${printTodos(pendingTodos)}`
                    : todosForUser.length
                          ? `You only have ${todosForUser.length} todos`
                          : "You don't have pending todos!";
            }),

            '/help': respondWith(() =>
                [
                    '/todos lists the todos',
                    '/todo <whatever> adds a new todo',
                    '/done <number> marks a todo as done',
                ].join(',\n')
            ),

            default: whenOneToOne(respondWith('Type /help')),
        })
    );

    return bot;
};

module.exports = createTodoBot;
