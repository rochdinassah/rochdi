'use strict';

module.exports = [
  'In this conversation I want you to answer some questions with a SINGLE word, number, or phrase and separate them with commas. respecting the order',
  'Those questions are a part of hCaptcha to verify that the user is not a bot and they question the user with three different text questions.',
  'Those questions are easy for human, but are very very tricky for AI, so double check the answers and do not fall on the trap. I am counting on you',
  'In this conversation I don\'t need from you any type of explanations or further talking in the response I need pure answers content: foo,bar,baz',
  'If you include something else on the response .ex.: Here are the answers\nfoo,bar,baz\nI am here if you need more help.', 
  'This will make it hard for me to parse the answers, so please respond with answers onyl .ex.: foo,bar,baz',
  'Given that those questions are very very very very tricky for AI, I will feed you with some dataset as examples and I want you to keep them in mind',
  'When you see (she/her) in a question .ex.: Imane (she/her) has xBrothers and ySisters... Put in mind that the siblings total is xBrothers+(ySisters+1)',
  'When you see (he/him) in a question .ex.: Yassine (he/him) has xBrothers and ySisters... Put in mind that the siblings total is (xBrothers+1)+ySisters+1',
  'In most cases, I will provide you with three independent questions in a stringified array. And I want you to not relate between them, answer every question independently',
  'Pay attention to not mixup the questions or answers because every question is independent even if you see the member names are the same and even if the questions are on the same message... every question is a new story...',
  'When processing questions that contain person names, replace each person\'s name with a random ID. For example: Youness -> 98908929847372392\nChloe -> 73827465891923456\nJack -> 19847365812984756\nAva -> 38475023984710923\nThis ensures that each question is treated independently and avoids any confusion between questions with similar names.',
  'Everytime you see has xBrothers and ySisters calculate the number of siblings... the answer must always be xBrothers+xSisters. ex.: Ayman (he/him) has 4 sisters and 9 brothers. How much siblings Ayman\'s sister or Ayman\'s brother has? correct answer will alwyas be 13',
  'The dataset I will give you is gonna be a stringified array of entries which you can parse it on your side to extract them.',
  'Those entries are an object with "question", "answer", and "reason" properties. The "reason" property will hold why the correct answer is this way.',
  'Please parse this object well and double learn from it because I noticed that even with this dataset you do errors sometimes so take your time to save them.',
  [
    {
      question: 'Given 999057^0b01011, what are the leading 4 numerals.',
      answer: '9990',
      reason: 'Do not make any computations here and start from left to right'
    },
    {
      question: 'In the family of Chloe (she/her), she has 14 brothers and 9 sisters. what\'s the number of siblings of her sister?',
      answer: '23',
      reason: '(she/her) for female (he/him) for male. 14+9+Chloe = the total of members(24), but we don\'t include her sister so 24-1=23'
    },
    {
      question: 'Jacob (he/him) has 15 sisters, and he also has 5 brothers. What is the number of brothers that his sister has?',
      answer: '6',
      reason: '(he/him) for male (she/her) for female. 15+5+Jacob = the total of members(21), we have 6 brothers here, so any of the sisters must have 6 brothers'
    },
    {
      question: 'Ava (she/her): she has 7 sisters and 14 brothers. Calculate the number of siblings belonging to one of Ava\'s sisters.',
      answer: '21',
      reason: 'All of the siblings (7+14+Ava = 22) would have a total of 21 siblings. Brothers and sisters in this case was only a trap for the AI'
    },
    {
      question: 'Hannah (she/her) has 15 brothers and 5 sisters. Calculate the number of siblings belonging to one of Hannah\'s sisters.',
      answer: '20',
      reason: 'All of the siblings (15+5+Hannah = 21) would have a total of 20 siblings. Brothers and sisters in this case was only a trap for the AI'
    },
    {
      question: 'Chloe (she/her): she has 14 sisters and 15 brothers. How many siblings does Chloe\'s sister have?',
      answer: '29',
      reason: 'All of the siblings (14+15+Chloe = 30) would have a total of 29 siblings. Brothers and sisters in this case was only a trap for the AI'
    },
    {
      question: 'Isaac (he/him)\'s siblings are 11 brothers and 13 sisters. What is the number of siblings that his brother has?',
      answer: '24',
      reason: 'All of the siblings (11+13+Isaac = 25) would have a total of 24 siblings. Brothers and sisters in this case was only a trap for the AI'
    },
    {
      question: 'Given 426533+99057681728, identify the concluding 5 numbers.',
      answer: '81728',
      reason: 'Do not interpret 426533+99057681728 computationally. Start always from left to right. In this case they ask to find the last 5 numbers "81728"... they may ask you about leading numbers sometimes and the number of required numbers may also vary'
    },
    {
      question: 'Stella (she/her) has 6 sisters, and she also has 14 brothers. How many siblings does Stella\'s brother have?',
      answer: '20',
      reason: 'All of the siblings (6+14+Stella = 21) would have a total of 21 siblings. Brothers and sisters in this case was only a trap for the AI'
    },
    {
      question: 'Provide the starting four numerals of 8870477-8585',
      answer: '8870',
      reason: 'As always, start from left to right. Do not interpret 8870477-8585 and take it as string... This is a trap for the AI to do x-y and give the four numerals of the sum... Instead, in this case take it as a string and get the 4 leading numbers'
    },
    {
      question: 'Provide the trailing seven numerals of 8870477-8585',
      answer: '4778585',
      reason: 'As always, start from left to right. In this case take it as a string and get the 7 trailing numbers and remove the "-" character 8870477-8585 -> 4778585'
    },
    {
      question: 'Maverick (he/him) has 2 sisters, and he also has 14 brothers. What\'s the total number of siblings for Maverick\'s sister?',
      answer: '16',
      reason: 'All of the siblings (2+14+Maverick = 17) would have a total of 16 siblings. Brothers and sisters in this case was only a trap for the AI'
    },
    {
      question: 'In the family of Ellie (she/her), she has 8 brothers and 13 sisters. What is the number of siblings that her sister has?',
      answer: '21',
      reason: 'All of the siblings (8+13+Ellie = 22) would have a total of 21 siblings. Brothers and sisters in this case was only a trap for the AI'
    },
    {
      question: 'Aurora (she/her) has 12 sisters, and she also has 3 brothers. Calculate the number of sisters belonging to one of Aurora\'s brothers.',
      answer: '13',
      reason: 'Every brother of the family has 13 sisters. Take care here because it may trick you to exclude Aurora and answer 12 instead of 13'
    },
    {
      question: 'The sequence 28456*0o972 has what as its starting three characters?',
      answer: '284',
      reason: 'As always, this is a trap that would make the AI does calculation and leave with the incorrect answer. *-+^|>><< are traps to interpret them mathematically except if they were used with simple number like 2+4 and even in that case you must double check the question'
    },
    {
      question: 'Nora (she/her) has 14 brothers and 14 sisters. How many sisters does Nora\'s brother have?',
      answer: '15',
      reason: 'Every brother of the family has 15 sisters. Take care here because it may trick you to exclude Nora and answer 15 instead of 16'
    },
    {
      question: 'In the family of Lucy (she/her), she has 5 brothers and 5 sisters. What\'s the total number of sisters for Lucy\'s brother?',
      answer: '6',
      reason: 'Every brother here must have 6 sisters. Pay attention to not respond 5 in such cases and fall in the trap.'
    },
    {
      question: 'Hazel (she/her): she has 11 brothers and 2 sisters. What\'s the total number of siblings for Hazel\'s sister?',
      answer: '13',
      reason: 'Every member must have a total of 13 siblings and the total of those mumbers is 14'
    },
    {
      question: 'Jack (he/him): he has 2 brothers and 6 sisters. What\'s the total number of brothers for Jack\'s sister?',
      answer: '3',
      reason: 'Every sister must have 3 brothers. 2 brothers+(jack (he/him)). Pay attention to not fall on the trap and answer the incorrect one "2" instead of "3"'
    },
    {
      question: 'Take Anthony (he/him), who has 4 brothers and 11 sisters. what\'s the number of brothers of his sister?',
      answer: '5',
      reason: 'Every sister must have 5 brothers. 4 brothers+(Take Anthony (he/him)). Pay attention to not fall on the trap and answer the incorrect one "4" instead of "5"'
    },
    {
      question: 'Camila (she/her): she has 8 sisters and 5 brothers. Calculate the number of sisters belonging to one of Camila\'s brothers.',
      answer: '9',
      reason: 'Every brother must have 9 brothers. 8 sisters+(Camila (she/her)). Pay attention to not fall on the trap and answer the incorrect one "8" instead of "9"'
    },
    {
      question: 'Amelia (she/her) has 7 sisters, and she also has 14 brothers. what\'s the number of sisters of her brother?',
      answer: '8',
      reason: 'Every brother must have 8 brothers. 7 sisters+(Amelia (she/her)). Pay attention to not fall on the trap and answer the incorrect one "7" instead of "8"'
    },
    {
      question: 'Anthony (he/him): he has 6 brothers and 10 sisters. What\'s the total number of siblings for Anthony\'s brother?',
      answer: '16',
      reason: 'Everytime you see has xBrothers and ySisters calculate the number of siblings... the answer must always be xBrothers+xSisters'
    }
  ]
].map(e => 'object' === typeof e ? JSON.stringify(e) : e).join('\n');