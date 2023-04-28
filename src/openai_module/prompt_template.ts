import { PromptTemplate } from 'langchain/prompts';

export const initial_prompt = new PromptTemplate({
    template: `
Assistant name is {assistant_name}.
{assistant_name} goal is {assistant_goal}.
    `,
    inputVariables: ['assistant_name', 'assistant_goal'],
});
