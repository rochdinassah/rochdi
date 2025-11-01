module.exports = {
  requirements: {
    url: '/backend-api/sentinel/chat-requirements',
    headers: {
      'Host': 'chatgpt.com',
      'Oai-Language': 'en-US',
      'Sec-Ch-Ua-Platform': '"Linux"',
      'Authorization': '',
      'Sec-Ch-Ua-Full-Version-List': '"Chromium";v="140.0.7339.185", "Not=A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.7339.185"',
      'Sec-Ch-Ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
      'Sec-Ch-Ua-Bitness': '"64"',
      'Sec-Ch-Ua-Model': '""',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Arch': '"x86"',
      'Oai-Device-Id': '',
      'Sec-Ch-Ua-Full-Version': '"140.0.7339.185"',
      'User-Agent': '',
      'Content-Type': 'application/json',
      'Oai-Client-Version': '',
      'Sec-Ch-Ua-Platform-Version': '"6.14.0"',
      'Accept': '*/*',
      'Origin': '',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7',
      'Priority': 'u=1, i'
    },
    body: {}
  },
  conversation: {
    url: '/backend-api/f/conversation',
    headers: {
      'Host': 'chatgpt.com',
      // 'Cookie': '',
      'Oai-Language': 'en-US',
      'Sec-Ch-Ua-Platform': '"Linux"',
      'Authorization': '',
      'Sec-Ch-Ua-Full-Version-List': '"Chromium";v="140.0.7339.185", "Not=A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.7339.185"',
      'Sec-Ch-Ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
      'Sec-Ch-Ua-Bitness': '"64"',
      'Sec-Ch-Ua-Model': '""',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Arch': '"x86"',
      'Openai-Sentinel-Proof-Token': '',
      'Sec-Ch-Ua-Full-Version': '"140.0.7339.185"',
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json',
      'Oai-Client-Version': '',
      'Oai-Echo-Logs': '0,7697,1,9509,0,18521,1,19728,0,27260,1,35133,0,54731',
      'Openai-Sentinel-Chat-Requirements-Token': '',
      'Oai-Device-Id': '',
      'User-Agent': '',
      'Sec-Ch-Ua-Platform-Version': '"6.14.0"',
      'Origin': '',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7',
      'Priority': 'u=1, i'
    },
    body: {
      action: 'next',
      messages: [{
        role: 'user',
        content: {
          content_type: 'text',
          parts: []
        }
      }],
      conversation_id: '',
      model: 'auto',
      conversation_mode: {
        kind: 'primary_assistant'
      },
      enable_message_followups: true,
      system_hints: [],
      supports_buffering: true,
      supported_encodings: [],
      paragen_cot_summary_display_override: 'allow',
      force_parallel_switch: 'auto',
    }
  }
};