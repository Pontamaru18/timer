document.addEventListener('DOMContentLoaded', () => {
    // 要素の取得
    const minutesDisplay = document.getElementById('minutes');
    const secondsDisplay = document.getElementById('seconds');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const progressCircle = document.querySelector('.progress-ring__circle');
    const completedSessionsDisplay = document.getElementById('completedSessions');
    const progressBar = document.querySelector('.progress');
    const achievementList = document.getElementById('achievementList');
    const tickSound = document.getElementById('tickSound');
    const alarmSound = document.getElementById('alarmSound');
    const achievementSound = document.getElementById('achievementSound');

    // 円形プログレスの設定
    const circleRadius = 140;
    const circumference = 2 * Math.PI * circleRadius;
    progressCircle.style.strokeDasharray = circumference;
    progressCircle.style.strokeDashoffset = circumference;

    // タイマー変数
    let timeLeft;
    let timerInterval;
    let isRunning = false;
    let isBreak = false;
    let completedSessions = 0;
    let currentMode = 'pomodoro';
    let achievements = [];

    // アチーブメントの定義
    const achievementDefinitions = [
        { id: 'first_session', title: 'はじめてのポモドーロ', description: '初めてのポモドーロを完了しました！', unlocked: false },
        { id: 'half_day', title: '半日クリア', description: '4つのポモドーロを完了しました！', unlocked: false },
        { id: 'full_day', title: '1日クリア', description: '8つのポモドーロを完了しました！', unlocked: false },
        { id: 'break_time', title: '休憩の達人', description: '初めての休憩を取りました', unlocked: false },
        { id: 'long_break', title: 'ロングブレイク', description: '長い休憩を取りました', unlocked: false },
        { id: 'consistency', title: '継続は力なり', description: '3日連続でポモドーロを完了', unlocked: false }
    ];

    // 初期化
    function init() {
        loadProgress();
        renderAchievements();
        setMode(25); // デフォルトで25分に設定
        updateProgressCircle();
    }

    // モード設定
    function setMode(minutes) {
        timeLeft = minutes * 60;
        updateDisplay();
        updateProgressCircle();
        
        // モードに応じたスタイルを適用
        document.documentElement.style.setProperty('--primary-color', 
            minutes === 5 ? 'var(--break-color)' : 
            minutes === 15 ? 'var(--secondary-color)' : '#4CAF50');
    }

    // 表示を更新
    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        minutesDisplay.textContent = minutes.toString().padStart(2, '0');
        secondsDisplay.textContent = seconds.toString().padStart(2, '0');
    }

    // プログレスサークルを更新
    function updateProgressCircle() {
        const totalTime = currentMode === 'pomodoro' ? 25 * 60 : 
                         currentMode === 'shortBreak' ? 5 * 60 : 15 * 60;
        const offset = circumference - (timeLeft / totalTime) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }

    // タイマースタート
    function startTimer() {
        if (isRunning) return;
        
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();
            updateProgressCircle();
            
            // チック音を再生（最後の5秒間）
            if (timeLeft <= 5 && timeLeft > 0) {
                playSound('tick');
            }
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerComplete();
            }
        }, 1000);
    }

    // タイマー一時停止
    function pauseTimer() {
        clearInterval(timerInterval);
        isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    // タイマーリセット
    function resetTimer() {
        clearInterval(timerInterval);
        isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        setMode(currentMode === 'pomodoro' ? 25 : currentMode === 'shortBreak' ? 5 : 15);
    }

    // タイマー完了時の処理
    function timerComplete() {
        playSound('alarm');
        
        if (currentMode === 'pomodoro') {
            completedSessions++;
            updateSessionCount();
            checkAchievements();
            
            // 4回に1回は長い休憩を提案
            if (completedSessions % 4 === 0) {
                currentMode = 'longBreak';
                setMode(15);
                showNotification('お疲れ様です！15分のロングブレイクをどうぞ！');
            } else {
                currentMode = 'shortBreak';
                setMode(5);
                showNotification('お疲れ様です！5分間の休憩をどうぞ！');
            }
            
            unlockAchievement('break_time');
            if (completedSessions >= 4) unlockAchievement('half_day');
            if (completedSessions >= 8) unlockAchievement('full_day');
        } else {
            // 休憩終了
            currentMode = 'pomodoro';
            setMode(25);
            showNotification('休憩終了！集中して作業を再開しましょう！');
            if (completedSessions === 1) unlockAchievement('first_session');
        }
        
        saveProgress();
    }

    // セッション数を更新
    function updateSessionCount() {
        completedSessionsDisplay.textContent = completedSessions;
        const progress = Math.min((completedSessions / 8) * 100, 100);
        progressBar.style.width = `${progress}%`;
    }

    // アチーブメントのロック解除
    function unlockAchievement(achievementId) {
        const achievement = achievements.find(a => a.id === achievementId);
        if (achievement && !achievement.unlocked) {
            achievement.unlocked = true;
            achievement.unlockedAt = new Date();
            showNotification(`アチーブメント解除: ${achievement.title}`);
            playSound('achievement');
            renderAchievements();
            saveProgress();
        }
    }

    // アチーブメントをチェック
    function checkAchievements() {
        // 連続日数のチェック（簡易実装）
        const lastCompletion = localStorage.getItem('lastCompletionDate');
        const today = new Date().toDateString();
        
        if (lastCompletion) {
            const lastDate = new Date(lastCompletion);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastDate.toDateString() === yesterday.toDateString()) {
                // 連続記録を更新
                const streak = parseInt(localStorage.getItem('streak') || '0') + 1;
                localStorage.setItem('streak', streak);
                
                if (streak >= 3) {
                    unlockAchievement('consistency');
                }
            } else if (lastDate.toDateString() !== today) {
                // 連続記録リセット
                localStorage.setItem('streak', '1');
            }
        } else {
            localStorage.setItem('streak', '1');
        }
        
        localStorage.setItem('lastCompletionDate', today);
    }

    // アチーブメントをレンダリング
    function renderAchievements() {
        achievementList.innerHTML = '';
        
        achievements.forEach(achievement => {
            const achievementEl = document.createElement('div');
            achievementEl.className = `achievement ${achievement.unlocked ? 'unlocked' : ''}`;
            achievementEl.innerHTML = `
                <i class="fas ${achievement.unlocked ? 'fa-trophy' : 'fa-lock'}"></i>
                <div class="achievement-text">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                </div>
            `;
            achievementList.appendChild(achievementEl);
        });
    }

    // 進捗を保存
    function saveProgress() {
        const progress = {
            completedSessions,
            achievements: achievements.map(a => ({
                id: a.id,
                unlocked: a.unlocked,
                unlockedAt: a.unlockedAt
            })),
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('pomodoroProgress', JSON.stringify(progress));
    }

    // 進捗を読み込み
    function loadProgress() {
        const savedProgress = localStorage.getItem('pomodoroProgress');
        
        if (savedProgress) {
            try {
                const progress = JSON.parse(savedProgress);
                completedSessions = progress.completedSessions || 0;
                
                // アチーブメントの状態を復元
                achievements = achievementDefinitions.map(def => {
                    const saved = progress.achievements?.find(a => a.id === def.id);
                    return {
                        ...def,
                        unlocked: saved?.unlocked || false,
                        unlockedAt: saved?.unlockedAt ? new Date(saved.unlockedAt) : null
                    };
                });
                
                updateSessionCount();
                return;
            } catch (e) {
                console.error('進捗の読み込みに失敗しました:', e);
            }
        }
        
        // デフォルトのアチーブメントを設定
        achievements = [...achievementDefinitions];
    }

    // サウンドを再生
    function playSound(type) {
        let sound;
        
        switch(type) {
            case 'tick':
                sound = tickSound;
                sound.volume = 0.3;
                break;
            case 'alarm':
                sound = alarmSound;
                sound.volume = 0.5;
                break;
            case 'achievement':
                sound = achievementSound;
                sound.volume = 0.7;
                break;
        }
        
        sound.currentTime = 0;
        sound.play().catch(e => console.log('サウンドの再生に失敗しました:', e));
    }

    // 通知を表示
    function showNotification(message) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            new Notification('ポモドーロタイマー', { body: message });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('ポモドーロタイマー', { body: message });
                }
            });
        }
        
        // ブラウザの通知が許可されていなくても、ページ内にメッセージを表示
        const notification = document.createElement('div');
        notification.className = 'floating-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }, 100);
    }

    // イベントリスナー
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes);
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (minutes === 5) {
                currentMode = 'shortBreak';
            } else if (minutes === 15) {
                currentMode = 'longBreak';
            } else {
                currentMode = 'pomodoro';
            }
            
            setMode(minutes);
            if (isRunning) {
                pauseTimer();
                startTimer();
            }
        });
    });
    
    // 通知の許可をリクエスト
    if ('Notification' in window) {
        Notification.requestPermission();
    }
    
    // 初期化
    init();
});
