// ScenePulse — Internationalization Module
// Provides t(key) function for UI string translations
// Translations cover core panel UI. English fallback for untranslated strings.

import { getLanguage } from './settings.js';

// ── Translation tables ──
// Keys match English strings. Each language provides its translation.
// Community contributions welcome — add a new language object below.
const TRANSLATIONS = {
'Russian': {
    // Section headers
    'Scene Details':'Детали сцены','Quest Journal':'Журнал квестов','Relationships':'Отношения',
    'Characters':'Персонажи','Story Ideas':'Идеи для сюжета','Inner Thoughts':'Внутренние мысли',
    'North Star':'Путеводная звезда','Main Quests':'Основные квесты','Side Quests':'Побочные квесты',
    'Active Tasks':'Активные задачи',
    // Badges
    'new':'новый','updated':'обновл.','resolved':'завершён',
    // Buttons & actions
    'Add quest':'Добавить квест','Cancel':'Отмена','Add Quest':'Добавить','Regenerate all':'Обновить всё',
    'Mark as completed':'Отметить выполненным','Remove quest':'Удалить квест','Restore quest':'Восстановить',
    'Stop Generation':'■ Остановить','Jump to latest':'К последнему','Copy':'Копировать',
    // Empty states
    'No scene data yet':'Нет данных о сцене','Send a message or click ⟳ to generate.':'Отправьте сообщение или нажмите ⟳.',
    'No active storyline quests':'Нет активных сюжетных квестов','No side quests discovered':'Побочных квестов нет',
    'No immediate tasks':'Нет срочных задач','Not yet revealed':'Ещё не раскрыто',
    // Form labels
    'Name':'Имя','Urgency':'Срочность','Details':'Детали','Critical':'Критич.','High':'Высок.','Moderate':'Средн.','Low':'Низк.',
    // Tooltips
    'Toggle edit mode':'Режим редактирования','Show empty fields':'Показать пустые поля',
    'Snap to left of chat':'Прикрепить слева','Ghost mode':'Призрачный режим','Regenerate thoughts':'Обновить мысли',
    'Hide thoughts':'Скрыть мысли','Hide panel':'Скрыть панель','Panel Manager':'Менеджер панелей',
    // Loading
    'Generating Scene':'Генерация сцены','Updating thoughts':'Обновление мыслей','Analyzing context':'Анализ контекста',
    // Diff viewer
    'Payload Inspector':'Инспектор данных','Changes Only':'Только изменения','Full Diff':'Полное сравнение',
    'Side by Side':'Бок о бок','Delta Payload':'Дельта','Previous':'Предыдущий','Current':'Текущий','Full Payload':'Полные данные',
    // Toasts
    'Completed':'Завершён','Removed':'Удалён','Added':'Добавлен','Regenerated':'Обновлено','Regeneration failed':'Ошибка обновления',
    'Remove Quest':'Удалить квест','Copied!':'Скопировано!',
    // Settings
    'General':'Общие','Enable ScenePulse':'Включить ScenePulse','Auto-generate on AI messages':'Авто-генерация при ответах ИИ',
    'Show thought bubbles':'Показывать мысли','Weather overlay effects':'Эффекты погоды','Time-of-day ambience':'Освещение времени суток',
    'Font scale':'Масштаб шрифта','Language':'Язык','Auto-detect':'Автоопределение',
    'Show developer tools':'Инструменты разработчика',
    // Field labels — scene
    'Topic':'Тема','Mood':'Настроение','Interaction':'Взаимодействие','Tension':'Напряжение',
    'Summary':'Резюме','Sounds':'Звуки','Present':'Присутствуют',
    // Field labels — character appearance
    'Hair':'Волосы','Face':'Лицо','Outfit':'Наряд','Dress':'Одежда','Posture':'Поза',
    'Proximity':'Близость','Physical':'Физическое','Inventory':'Инвентарь',
    // Field labels — goals
    'Need':'Потребность','Short-Term':'Краткоср.','Long-Term':'Долгоср.',
    // Field labels — relationship meta
    'Time Known':'Знакомство','Milestone':'Веха',
    // Field labels — meters
    'Affection':'Привязанность','Trust':'Доверие','Desire':'Желание','Stress':'Стресс','Compat':'Совмест.',
    // Field labels — fertility
    'Status':'Статус','Reason':'Причина','Cycle Phase':'Фаза цикла','Cycle Day':'День цикла',
    'Window':'Окно','Pregnancy':'Беременность','Preg. Week':'Нед. берем.','Notes':'Заметки',
    'Fertility: N/A':'Фертильность: Н/Д',
    // Stats footer
    'Together':'Совместно','Separate':'Раздельно','Inspect':'Инспекция',
    'Auto':'Авто','Backup':'Резерв','Fallback':'Откат','Full regen':'Полная ген.','Settings':'Настройки',
    'Msg regen':'Обновл. сообщ.','Thoughts':'Мысли',
    'Message index':'Индекс сообщения','Estimated tokens':'Оценка токенов','Generation time':'Время генерации',
    // Panel Manager
    'Enable All':'Включить всё','Disable All':'Отключить всё','Custom Panels':'Пользовательские панели',
    '+ Add Custom Panel':'+ Добавить панель',
    'Expand/Collapse sections':'Развернуть/свернуть секции','Condense view':'Компактный вид',
    // Edit mode
    'Click any highlighted field to edit':'Нажмите на подсвеченное поле для редактирования',
    'Edit Mode On':'Режим редактирования вкл.','Edit Mode Off':'Режим редактирования выкл.',
    // Mobile
    'Scene updated':'Сцена обновлена','Open ScenePulse':'Открыть ScenePulse',
    // Loading
    'Updating scene data':'Обновление данных сцены','Reading context and analyzing characters':'Чтение контекста и анализ персонажей',
    // Settings sections/labels
    'Setup Guide':'Руководство','Guided Tour':'Обзорная экскурсия','Context msgs':'Контекст. сообщ.',
    'Max retries':'Макс. попыток','Delta mode':'Режим дельта','Injection Method':'Метод вставки',
    'Mode':'Режим','Fallback Recovery':'Восстановление',
    'Enable automatic fallback':'Автоматический откат','Fallback Profile':'Профиль отката',
    'Fallback Preset':'Пресет отката','Refresh Profiles':'Обновить профили',
    'Connection Profile':'Профиль подключения','Chat Completion Preset':'Пресет завершения чата',
    'Prompt Mode':'Режим промпта','Context Embedding':'Встраивание контекста',
    'Embed snapshots':'Встраивание снимков','Embed as role':'Встроить как роль',
    'System':'Система','User':'Пользователь','Assistant':'Ассистент',
    'Lorebooks':'Книги знаний','Filter Mode':'Режим фильтра','Refresh Lorebooks':'Обновить книги знаний',
    'System Prompt':'Системный промпт','JSON Schema':'JSON-схема','Reset to Default':'Сброс по умолч.',
    'Actions':'Действия','Generate':'Генерировать','Clear Data':'Очистить данные','Reset Settings':'Сброс настроек',
    'Debug':'Отладка','SP Log':'Журнал SP','View Log':'Просмотр журнала','Console':'Консоль',
    'Last Response':'Последний ответ','Active':'Активно','Off':'Выкл.',
    // Toast messages
    'Profiles refreshed':'Профили обновлены','Fallback profiles refreshed':'Профили отката обновлены',
    'Lorebooks refreshed':'Книги знаний обновлены','System prompt reset to default':'Системный промпт сброшен',
    'Prompt copied':'Промпт скопирован','Schema reset to default':'Схема сброшена',
    'Schema copied':'Схема скопирована','Done':'Готово','Failed':'Ошибка',
    'Data cleared':'Данные очищены','Cleared':'Очищено','Settings reset to defaults':'Настройки сброшены',
    'SP Log copied':'Журнал SP скопирован','Console copied':'Консоль скопирована',
    'Copy failed':'Ошибка копирования','No API response captured yet':'Нет захваченного ответа API',
    'Last response copied':'Последний ответ скопирован','Debug log copied':'Журнал отладки скопирован',
    'Invalid JSON':'Неверный JSON',
    // Story ideas
    'Story direction sent':'Направление истории отправлено','Story idea copied':'Идея для сюжета скопирована',
    // Custom panels
    'Panel name':'Название панели','Key':'Ключ','Label':'Метка','Type':'Тип','LLM Hint':'Подсказка LLM',
    'Add Field':'Добавить поле','Delete panel':'Удалить панель','Remove this field':'Удалить поле',
    'Drag to reorder':'Перетащите для сортировки','No custom panels yet':'Нет пользовательских панелей',
    // Quest dialog
    'Quest name':'Название квеста','1-2 sentences from your perspective':'1-2 предложения от вашего лица',
},
'Japanese': {
    'Scene Details':'シーン詳細','Quest Journal':'クエストジャーナル','Relationships':'関係','Characters':'キャラクター',
    'Story Ideas':'ストーリーアイデア','Inner Thoughts':'内なる思考','North Star':'北極星','Main Quests':'メインクエスト',
    'Side Quests':'サブクエスト','Active Tasks':'アクティブタスク',
    'new':'新規','updated':'更新','resolved':'完了',
    'Add quest':'クエスト追加','Cancel':'キャンセル','Add Quest':'追加','Regenerate all':'全て再生成',
    'Mark as completed':'完了にする','Remove quest':'クエスト削除','Restore quest':'復元',
    'Stop Generation':'■ 生成停止','Jump to latest':'最新へ','Copy':'コピー',
    'No scene data yet':'シーンデータなし','Send a message or click ⟳ to generate.':'メッセージを送信するか⟳をクリック',
    'No active storyline quests':'アクティブなクエストなし','No side quests discovered':'サブクエストなし',
    'No immediate tasks':'即時タスクなし','Not yet revealed':'未公開',
    'Name':'名前','Urgency':'緊急度','Details':'詳細','Critical':'緊急','High':'高','Moderate':'中','Low':'低',
    'Generating Scene':'シーン生成中','Payload Inspector':'ペイロード検査','Changes Only':'変更のみ',
    'Full Diff':'完全比較','Side by Side':'並列表示','Previous':'前回','Current':'現在',
    'General':'一般','Language':'言語','Auto-detect':'自動検出','Font scale':'フォント倍率',
    'Toggle edit mode':'編集モード切替','Show empty fields':'空フィールド表示',
    'Snap to left of chat':'チャット左に固定','Ghost mode':'ゴーストモード','Regenerate thoughts':'思考を再生成',
    'Hide thoughts':'思考を非表示','Hide panel':'パネルを非表示','Panel Manager':'パネルマネージャー',
    'Updating thoughts':'思考を更新中','Analyzing context':'コンテキスト分析中',
    'Delta Payload':'デルタ','Full Payload':'完全データ',
    'Completed':'完了','Removed':'削除','Added':'追加','Regenerated':'再生成','Regeneration failed':'再生成失敗',
    'Remove Quest':'クエスト削除','Copied!':'コピー済み！',
    'Enable ScenePulse':'ScenePulse有効化','Auto-generate on AI messages':'AIメッセージで自動生成',
    'Show thought bubbles':'思考バブル表示','Weather overlay effects':'天気オーバーレイ効果',
    'Time-of-day ambience':'時間帯の雰囲気','Show developer tools':'開発者ツール表示',
    // Field labels — scene
    'Topic':'トピック','Mood':'ムード','Interaction':'インタラクション','Tension':'テンション',
    'Summary':'要約','Sounds':'サウンド','Present':'存在',
    // Field labels — character appearance
    'Hair':'髪','Face':'顔','Outfit':'服装','Dress':'着衣状態','Posture':'姿勢',
    'Proximity':'近接','Physical':'身体状態','Inventory':'所持品',
    // Field labels — goals
    'Need':'欲求','Short-Term':'短期','Long-Term':'長期',
    // Field labels — relationship meta
    'Time Known':'知り合い期間','Milestone':'マイルストーン',
    // Field labels — meters
    'Affection':'愛情','Trust':'信頼','Desire':'欲望','Stress':'ストレス','Compat':'相性',
    // Field labels — fertility
    'Status':'状態','Reason':'理由','Cycle Phase':'周期フェーズ','Cycle Day':'周期日',
    'Window':'ウィンドウ','Pregnancy':'妊娠','Preg. Week':'妊娠週数','Notes':'メモ',
    'Fertility: N/A':'生殖：該当なし',
    // Stats footer
    'Together':'統合','Separate':'分離','Inspect':'検査',
    'Auto':'自動','Backup':'バックアップ','Fallback':'フォールバック','Full regen':'完全再生成','Settings':'設定',
    'Msg regen':'メッセージ再生成','Thoughts':'思考',
    'Message index':'メッセージ番号','Estimated tokens':'推定トークン','Generation time':'生成時間',
    // Panel Manager
    'Enable All':'全て有効','Disable All':'全て無効','Custom Panels':'カスタムパネル',
    '+ Add Custom Panel':'+ カスタムパネル追加',
    'Expand/Collapse sections':'セクション展開/折りたたみ','Condense view':'コンパクト表示',
    // Edit mode
    'Click any highlighted field to edit':'ハイライトされたフィールドをクリックして編集',
    'Edit Mode On':'編集モードON','Edit Mode Off':'編集モードOFF',
    // Mobile
    'Scene updated':'シーン更新','Open ScenePulse':'ScenePulseを開く',
    // Loading
    'Updating scene data':'シーンデータ更新中','Reading context and analyzing characters':'コンテキスト読取・キャラ分析中',
    // Settings sections/labels
    'Setup Guide':'セットアップガイド','Guided Tour':'ガイドツアー','Context msgs':'コンテキストメッセージ',
    'Max retries':'最大リトライ','Delta mode':'デルタモード','Injection Method':'注入方法',
    'Mode':'モード','Fallback Recovery':'フォールバック回復',
    'Enable automatic fallback':'自動フォールバック有効','Fallback Profile':'フォールバックプロファイル',
    'Fallback Preset':'フォールバックプリセット','Refresh Profiles':'プロファイル更新',
    'Connection Profile':'接続プロファイル','Chat Completion Preset':'チャット補完プリセット',
    'Prompt Mode':'プロンプトモード','Context Embedding':'コンテキスト埋め込み',
    'Embed snapshots':'スナップショット埋め込み','Embed as role':'ロールとして埋め込み',
    'System':'システム','User':'ユーザー','Assistant':'アシスタント',
    'Lorebooks':'ロアブック','Filter Mode':'フィルターモード','Refresh Lorebooks':'ロアブック更新',
    'System Prompt':'システムプロンプト','JSON Schema':'JSONスキーマ','Reset to Default':'デフォルトに戻す',
    'Actions':'アクション','Generate':'生成','Clear Data':'データクリア','Reset Settings':'設定リセット',
    'Debug':'デバッグ','SP Log':'SPログ','View Log':'ログ表示','Console':'コンソール',
    'Last Response':'最終レスポンス','Active':'有効','Off':'無効',
    // Toast messages
    'Profiles refreshed':'プロファイル更新済み','Fallback profiles refreshed':'フォールバックプロファイル更新済み',
    'Lorebooks refreshed':'ロアブック更新済み','System prompt reset to default':'システムプロンプトをリセット',
    'Prompt copied':'プロンプトコピー済み','Schema reset to default':'スキーマをリセット',
    'Schema copied':'スキーマコピー済み','Done':'完了','Failed':'失敗',
    'Data cleared':'データクリア済み','Cleared':'クリア済み','Settings reset to defaults':'設定をリセット',
    'SP Log copied':'SPログコピー済み','Console copied':'コンソールコピー済み',
    'Copy failed':'コピー失敗','No API response captured yet':'APIレスポンス未取得',
    'Last response copied':'最終レスポンスコピー済み','Debug log copied':'デバッグログコピー済み',
    'Invalid JSON':'無効なJSON',
    // Story ideas
    'Story direction sent':'ストーリー方向送信済み','Story idea copied':'ストーリーアイデアコピー済み',
    // Custom panels
    'Panel name':'パネル名','Key':'キー','Label':'ラベル','Type':'タイプ','LLM Hint':'LLMヒント',
    'Add Field':'フィールド追加','Delete panel':'パネル削除','Remove this field':'フィールド削除',
    'Drag to reorder':'ドラッグで並べ替え','No custom panels yet':'カスタムパネルなし',
    // Quest dialog
    'Quest name':'クエスト名','1-2 sentences from your perspective':'あなたの視点から1-2文で',
},
'Korean': {
    'Scene Details':'장면 세부사항','Quest Journal':'퀘스트 저널','Relationships':'관계','Characters':'캐릭터',
    'Story Ideas':'스토리 아이디어','Inner Thoughts':'내면의 생각','North Star':'북극성','Main Quests':'메인 퀘스트',
    'Side Quests':'사이드 퀘스트','Active Tasks':'활성 작업',
    'new':'신규','updated':'갱신','resolved':'완료',
    'Add quest':'퀘스트 추가','Cancel':'취소','Add Quest':'추가','Regenerate all':'전체 재생성',
    'No scene data yet':'장면 데이터 없음','Not yet revealed':'아직 밝혀지지 않음',
    'Name':'이름','Urgency':'긴급도','Details':'세부사항','Critical':'긴급','High':'높음','Moderate':'보통','Low':'낮음',
    'Generating Scene':'장면 생성 중','Language':'언어','Auto-detect':'자동 감지',
    'Mark as completed':'완료 표시','Remove quest':'퀘스트 삭제','Restore quest':'퀘스트 복원',
    'Stop Generation':'■ 생성 중지','Jump to latest':'최신으로','Copy':'복사',
    'Toggle edit mode':'편집 모드 전환','Show empty fields':'빈 필드 표시',
    'Snap to left of chat':'채팅 왼쪽에 고정','Ghost mode':'고스트 모드','Regenerate thoughts':'생각 재생성',
    'Hide thoughts':'생각 숨기기','Hide panel':'패널 숨기기','Panel Manager':'패널 관리자',
    'Updating thoughts':'생각 업데이트 중','Analyzing context':'컨텍스트 분석 중',
    'General':'일반','Font scale':'글꼴 배율',
    'Enable ScenePulse':'ScenePulse 활성화','Auto-generate on AI messages':'AI 메시지에서 자동 생성',
    'Show thought bubbles':'생각 풍선 표시','Weather overlay effects':'날씨 오버레이 효과',
    'Time-of-day ambience':'시간대 분위기','Show developer tools':'개발자 도구 표시',
    'Payload Inspector':'페이로드 검사기','Changes Only':'변경사항만','Full Diff':'전체 비교',
    'Side by Side':'나란히 보기','Delta Payload':'델타','Previous':'이전','Current':'현재','Full Payload':'전체 데이터',
    'Completed':'완료','Removed':'삭제됨','Added':'추가됨','Regenerated':'재생성됨','Regeneration failed':'재생성 실패',
    'Remove Quest':'퀘스트 삭제','Copied!':'복사됨!',
    // Field labels — scene
    'Topic':'주제','Mood':'분위기','Interaction':'상호작용','Tension':'긴장감',
    'Summary':'요약','Sounds':'소리','Present':'출석',
    // Field labels — character appearance
    'Hair':'머리카락','Face':'얼굴','Outfit':'복장','Dress':'착용상태','Posture':'자세',
    'Proximity':'근접','Physical':'신체상태','Inventory':'소지품',
    // Field labels — goals
    'Need':'필요','Short-Term':'단기','Long-Term':'장기',
    // Field labels — relationship meta
    'Time Known':'알고 지낸 기간','Milestone':'이정표',
    // Field labels — meters
    'Affection':'애정','Trust':'신뢰','Desire':'욕구','Stress':'스트레스','Compat':'호환성',
    // Field labels — fertility
    'Status':'상태','Reason':'이유','Cycle Phase':'주기 단계','Cycle Day':'주기 일',
    'Window':'기간','Pregnancy':'임신','Preg. Week':'임신 주차','Notes':'메모',
    'Fertility: N/A':'생식: 해당없음',
    // Stats footer
    'Together':'통합','Separate':'분리','Inspect':'검사',
    'Auto':'자동','Backup':'백업','Fallback':'폴백','Full regen':'전체 재생성','Settings':'설정',
    'Msg regen':'메시지 재생성','Thoughts':'생각',
    'Message index':'메시지 번호','Estimated tokens':'추정 토큰','Generation time':'생성 시간',
    // Panel Manager
    'Enable All':'전체 활성화','Disable All':'전체 비활성화','Custom Panels':'커스텀 패널',
    '+ Add Custom Panel':'+ 커스텀 패널 추가',
    'Expand/Collapse sections':'섹션 펼침/접기','Condense view':'축소 보기',
    // Edit mode
    'Click any highlighted field to edit':'강조 표시된 필드를 클릭하여 편집',
    'Edit Mode On':'편집 모드 켜짐','Edit Mode Off':'편집 모드 꺼짐',
    // Mobile
    'Scene updated':'장면 업데이트됨','Open ScenePulse':'ScenePulse 열기',
    // Loading
    'Updating scene data':'장면 데이터 업데이트 중','Reading context and analyzing characters':'컨텍스트 읽기 및 캐릭터 분석 중',
    // Settings sections/labels
    'Setup Guide':'설정 가이드','Guided Tour':'가이드 투어','Context msgs':'컨텍스트 메시지',
    'Max retries':'최대 재시도','Delta mode':'델타 모드','Injection Method':'주입 방법',
    'Mode':'모드','Fallback Recovery':'폴백 복구',
    'Enable automatic fallback':'자동 폴백 활성화','Fallback Profile':'폴백 프로필',
    'Fallback Preset':'폴백 프리셋','Refresh Profiles':'프로필 새로고침',
    'Connection Profile':'연결 프로필','Chat Completion Preset':'채팅 완성 프리셋',
    'Prompt Mode':'프롬프트 모드','Context Embedding':'컨텍스트 임베딩',
    'Embed snapshots':'스냅샷 임베딩','Embed as role':'역할로 임베딩',
    'System':'시스템','User':'사용자','Assistant':'어시스턴트',
    'Lorebooks':'로어북','Filter Mode':'필터 모드','Refresh Lorebooks':'로어북 새로고침',
    'System Prompt':'시스템 프롬프트','JSON Schema':'JSON 스키마','Reset to Default':'기본값으로 복원',
    'Actions':'동작','Generate':'생성','Clear Data':'데이터 삭제','Reset Settings':'설정 초기화',
    'Debug':'디버그','SP Log':'SP 로그','View Log':'로그 보기','Console':'콘솔',
    'Last Response':'최종 응답','Active':'활성','Off':'비활성',
    // Toast messages
    'Profiles refreshed':'프로필 새로고침 완료','Fallback profiles refreshed':'폴백 프로필 새로고침 완료',
    'Lorebooks refreshed':'로어북 새로고침 완료','System prompt reset to default':'시스템 프롬프트 초기화됨',
    'Prompt copied':'프롬프트 복사됨','Schema reset to default':'스키마 초기화됨',
    'Schema copied':'스키마 복사됨','Done':'완료','Failed':'실패',
    'Data cleared':'데이터 삭제됨','Cleared':'삭제됨','Settings reset to defaults':'설정 초기화됨',
    'SP Log copied':'SP 로그 복사됨','Console copied':'콘솔 복사됨',
    'Copy failed':'복사 실패','No API response captured yet':'캡처된 API 응답 없음',
    'Last response copied':'최종 응답 복사됨','Debug log copied':'디버그 로그 복사됨',
    'Invalid JSON':'유효하지 않은 JSON',
    // Story ideas
    'Story direction sent':'스토리 방향 전송됨','Story idea copied':'스토리 아이디어 복사됨',
    // Custom panels
    'Panel name':'패널 이름','Key':'키','Label':'레이블','Type':'유형','LLM Hint':'LLM 힌트',
    'Add Field':'필드 추가','Delete panel':'패널 삭제','Remove this field':'필드 삭제',
    'Drag to reorder':'드래그하여 정렬','No custom panels yet':'커스텀 패널 없음',
    // Quest dialog
    'Quest name':'퀘스트 이름','1-2 sentences from your perspective':'당신의 관점에서 1-2문장',
},
'Chinese (Simplified)': {
    'Scene Details':'场景详情','Quest Journal':'任务日志','Relationships':'关系','Characters':'角色',
    'Story Ideas':'剧情构想','Inner Thoughts':'内心想法','North Star':'北极星','Main Quests':'主线任务',
    'Side Quests':'支线任务','Active Tasks':'当前任务',
    'new':'新','updated':'更新','resolved':'完成',
    'Add quest':'添加任务','Cancel':'取消','Add Quest':'添加','Regenerate all':'全部重新生成',
    'No scene data yet':'暂无场景数据','Not yet revealed':'尚未揭示',
    'Name':'名称','Urgency':'紧急程度','Details':'详情','Critical':'紧急','High':'高','Moderate':'中','Low':'低',
    'Generating Scene':'生成场景中','Language':'语言','Auto-detect':'自动检测',
    'Mark as completed':'标记完成','Remove quest':'删除任务','Restore quest':'恢复任务',
    'Stop Generation':'■ 停止生成','Jump to latest':'跳到最新','Copy':'复制',
    'Toggle edit mode':'切换编辑模式','Show empty fields':'显示空字段',
    'Snap to left of chat':'固定到聊天左侧','Ghost mode':'幽灵模式','Regenerate thoughts':'重新生成想法',
    'Hide thoughts':'隐藏想法','Hide panel':'隐藏面板','Panel Manager':'面板管理器',
    'Updating thoughts':'更新想法中','Analyzing context':'分析上下文中',
    'General':'常规','Font scale':'字体缩放',
    'Enable ScenePulse':'启用ScenePulse','Auto-generate on AI messages':'AI消息自动生成',
    'Show thought bubbles':'显示思考气泡','Weather overlay effects':'天气覆盖效果',
    'Time-of-day ambience':'时间段氛围','Show developer tools':'显示开发者工具',
    'Payload Inspector':'负载检查器','Changes Only':'仅变更','Full Diff':'完整对比',
    'Side by Side':'并排显示','Delta Payload':'增量','Previous':'上一个','Current':'当前','Full Payload':'完整数据',
    'Completed':'已完成','Removed':'已删除','Added':'已添加','Regenerated':'已重新生成','Regeneration failed':'重新生成失败',
    'Remove Quest':'删除任务','Copied!':'已复制！',
    // Field labels — scene
    'Topic':'话题','Mood':'情绪','Interaction':'互动','Tension':'紧张度',
    'Summary':'摘要','Sounds':'声音','Present':'在场',
    // Field labels — character appearance
    'Hair':'发型','Face':'面部','Outfit':'服装','Dress':'着装状态','Posture':'姿态',
    'Proximity':'距离','Physical':'身体状态','Inventory':'物品栏',
    // Field labels — goals
    'Need':'需求','Short-Term':'短期','Long-Term':'长期',
    // Field labels — relationship meta
    'Time Known':'认识时间','Milestone':'里程碑',
    // Field labels — meters
    'Affection':'感情','Trust':'信任','Desire':'欲望','Stress':'压力','Compat':'兼容',
    // Field labels — fertility
    'Status':'状态','Reason':'原因','Cycle Phase':'周期阶段','Cycle Day':'周期天数',
    'Window':'窗口期','Pregnancy':'怀孕','Preg. Week':'孕周','Notes':'备注',
    'Fertility: N/A':'生育：不适用',
    // Stats footer
    'Together':'合并','Separate':'分离','Inspect':'检查',
    'Auto':'自动','Backup':'备份','Fallback':'回退','Full regen':'完全重新生成','Settings':'设置',
    'Msg regen':'消息重新生成','Thoughts':'想法',
    'Message index':'消息索引','Estimated tokens':'预估令牌数','Generation time':'生成时间',
    // Panel Manager
    'Enable All':'全部启用','Disable All':'全部禁用','Custom Panels':'自定义面板',
    '+ Add Custom Panel':'+ 添加自定义面板',
    'Expand/Collapse sections':'展开/折叠区域','Condense view':'紧凑视图',
    // Edit mode
    'Click any highlighted field to edit':'点击高亮字段进行编辑',
    'Edit Mode On':'编辑模式开启','Edit Mode Off':'编辑模式关闭',
    // Mobile
    'Scene updated':'场景已更新','Open ScenePulse':'打开ScenePulse',
    // Loading
    'Updating scene data':'正在更新场景数据','Reading context and analyzing characters':'正在读取上下文并分析角色',
    // Settings sections/labels
    'Setup Guide':'设置指南','Guided Tour':'引导教程','Context msgs':'上下文消息',
    'Max retries':'最大重试','Delta mode':'增量模式','Injection Method':'注入方法',
    'Mode':'模式','Fallback Recovery':'回退恢复',
    'Enable automatic fallback':'启用自动回退','Fallback Profile':'回退配置',
    'Fallback Preset':'回退预设','Refresh Profiles':'刷新配置',
    'Connection Profile':'连接配置','Chat Completion Preset':'聊天补全预设',
    'Prompt Mode':'提示模式','Context Embedding':'上下文嵌入',
    'Embed snapshots':'嵌入快照','Embed as role':'嵌入角色',
    'System':'系统','User':'用户','Assistant':'助手',
    'Lorebooks':'知识库','Filter Mode':'过滤模式','Refresh Lorebooks':'刷新知识库',
    'System Prompt':'系统提示','JSON Schema':'JSON模式','Reset to Default':'恢复默认',
    'Actions':'操作','Generate':'生成','Clear Data':'清除数据','Reset Settings':'重置设置',
    'Debug':'调试','SP Log':'SP日志','View Log':'查看日志','Console':'控制台',
    'Last Response':'上次响应','Active':'活动','Off':'关闭',
    // Toast messages
    'Profiles refreshed':'配置已刷新','Fallback profiles refreshed':'回退配置已刷新',
    'Lorebooks refreshed':'知识库已刷新','System prompt reset to default':'系统提示已重置',
    'Prompt copied':'提示已复制','Schema reset to default':'模式已重置',
    'Schema copied':'模式已复制','Done':'完成','Failed':'失败',
    'Data cleared':'数据已清除','Cleared':'已清除','Settings reset to defaults':'设置已重置',
    'SP Log copied':'SP日志已复制','Console copied':'控制台已复制',
    'Copy failed':'复制失败','No API response captured yet':'尚无API响应',
    'Last response copied':'上次响应已复制','Debug log copied':'调试日志已复制',
    'Invalid JSON':'无效JSON',
    // Story ideas
    'Story direction sent':'故事方向已发送','Story idea copied':'剧情构想已复制',
    // Custom panels
    'Panel name':'面板名称','Key':'键','Label':'标签','Type':'类型','LLM Hint':'LLM提示',
    'Add Field':'添加字段','Delete panel':'删除面板','Remove this field':'删除字段',
    'Drag to reorder':'拖动排序','No custom panels yet':'暂无自定义面板',
    // Quest dialog
    'Quest name':'任务名称','1-2 sentences from your perspective':'从您的角度写1-2句话',
},
'Spanish': {
    'Scene Details':'Detalles de escena','Quest Journal':'Diario de misiones','Relationships':'Relaciones','Characters':'Personajes',
    'Story Ideas':'Ideas de historia','Inner Thoughts':'Pensamientos internos','North Star':'Estrella guía','Main Quests':'Misiones principales',
    'Side Quests':'Misiones secundarias','Active Tasks':'Tareas activas',
    'new':'nuevo','updated':'actualiz.','resolved':'resuelto',
    'Add quest':'Añadir misión','Cancel':'Cancelar','Add Quest':'Añadir','Regenerate all':'Regenerar todo',
    'No scene data yet':'Sin datos de escena','Not yet revealed':'Aún no revelado',
    'Name':'Nombre','Urgency':'Urgencia','Details':'Detalles','Critical':'Crítica','High':'Alta','Moderate':'Media','Low':'Baja',
    'Generating Scene':'Generando escena','Language':'Idioma','Auto-detect':'Auto-detectar',
    'Mark as completed':'Marcar completada','Remove quest':'Eliminar misión','Restore quest':'Restaurar misión',
    'Stop Generation':'■ Detener','Jump to latest':'Ir al último','Copy':'Copiar',
    'Toggle edit mode':'Modo edición','Show empty fields':'Mostrar campos vacíos',
    'Snap to left of chat':'Fijar a la izquierda','Ghost mode':'Modo fantasma','Regenerate thoughts':'Regenerar pensamientos',
    'Hide thoughts':'Ocultar pensamientos','Hide panel':'Ocultar panel','Panel Manager':'Gestor de paneles',
    'Updating thoughts':'Actualizando pensamientos','Analyzing context':'Analizando contexto',
    'General':'General','Font scale':'Escala de fuente',
    'Enable ScenePulse':'Activar ScenePulse','Auto-generate on AI messages':'Auto-generar con mensajes IA',
    'Show thought bubbles':'Mostrar burbujas de pensamiento','Weather overlay effects':'Efectos de clima',
    'Time-of-day ambience':'Ambiente horario','Show developer tools':'Herramientas de desarrollo',
    'Payload Inspector':'Inspector de datos','Changes Only':'Solo cambios','Full Diff':'Comparación completa',
    'Side by Side':'Lado a lado','Delta Payload':'Delta','Previous':'Anterior','Current':'Actual','Full Payload':'Datos completos',
    'Completed':'Completada','Removed':'Eliminada','Added':'Añadida','Regenerated':'Regenerado','Regeneration failed':'Error de regeneración',
    'Remove Quest':'Eliminar misión','Copied!':'¡Copiado!',
    // Field labels — scene
    'Topic':'Tema','Mood':'Ánimo','Interaction':'Interacción','Tension':'Tensión',
    'Summary':'Resumen','Sounds':'Sonidos','Present':'Presentes',
    // Field labels — character appearance
    'Hair':'Cabello','Face':'Rostro','Outfit':'Atuendo','Dress':'Vestimenta','Posture':'Postura',
    'Proximity':'Proximidad','Physical':'Estado físico','Inventory':'Inventario',
    // Field labels — goals
    'Need':'Necesidad','Short-Term':'Corto plazo','Long-Term':'Largo plazo',
    // Field labels — relationship meta
    'Time Known':'Tiempo conocido','Milestone':'Hito',
    // Field labels — meters
    'Affection':'Afecto','Trust':'Confianza','Desire':'Deseo','Stress':'Estrés','Compat':'Compat.',
    // Field labels — fertility
    'Status':'Estado','Reason':'Razón','Cycle Phase':'Fase del ciclo','Cycle Day':'Día del ciclo',
    'Window':'Ventana','Pregnancy':'Embarazo','Preg. Week':'Sem. embarazo','Notes':'Notas',
    'Fertility: N/A':'Fertilidad: N/A',
    // Stats footer
    'Together':'Junto','Separate':'Separado','Inspect':'Inspeccionar',
    'Auto':'Auto','Backup':'Respaldo','Fallback':'Reserva','Full regen':'Regen. completa','Settings':'Ajustes',
    'Msg regen':'Regen. mensaje','Thoughts':'Pensamientos',
    'Message index':'Índice de mensaje','Estimated tokens':'Tokens estimados','Generation time':'Tiempo de generación',
    // Panel Manager
    'Enable All':'Activar todo','Disable All':'Desactivar todo','Custom Panels':'Paneles personalizados',
    '+ Add Custom Panel':'+ Añadir panel',
    'Expand/Collapse sections':'Expandir/Colapsar secciones','Condense view':'Vista condensada',
    // Edit mode
    'Click any highlighted field to edit':'Haz clic en cualquier campo resaltado para editar',
    'Edit Mode On':'Modo edición activado','Edit Mode Off':'Modo edición desactivado',
    // Mobile
    'Scene updated':'Escena actualizada','Open ScenePulse':'Abrir ScenePulse',
    // Loading
    'Updating scene data':'Actualizando datos de escena','Reading context and analyzing characters':'Leyendo contexto y analizando personajes',
    // Settings sections/labels
    'Setup Guide':'Guía de configuración','Guided Tour':'Tour guiado','Context msgs':'Mensajes de contexto',
    'Max retries':'Máx. reintentos','Delta mode':'Modo delta','Injection Method':'Método de inyección',
    'Mode':'Modo','Fallback Recovery':'Recuperación de reserva',
    'Enable automatic fallback':'Activar reserva automática','Fallback Profile':'Perfil de reserva',
    'Fallback Preset':'Preset de reserva','Refresh Profiles':'Actualizar perfiles',
    'Connection Profile':'Perfil de conexión','Chat Completion Preset':'Preset de completado',
    'Prompt Mode':'Modo de prompt','Context Embedding':'Incrustación de contexto',
    'Embed snapshots':'Incrustar snapshots','Embed as role':'Incrustar como rol',
    'System':'Sistema','User':'Usuario','Assistant':'Asistente',
    'Lorebooks':'Lorebooks','Filter Mode':'Modo de filtro','Refresh Lorebooks':'Actualizar lorebooks',
    'System Prompt':'Prompt del sistema','JSON Schema':'Esquema JSON','Reset to Default':'Restablecer',
    'Actions':'Acciones','Generate':'Generar','Clear Data':'Limpiar datos','Reset Settings':'Restablecer ajustes',
    'Debug':'Depuración','SP Log':'Registro SP','View Log':'Ver registro','Console':'Consola',
    'Last Response':'Última respuesta','Active':'Activo','Off':'Desactivado',
    // Toast messages
    'Profiles refreshed':'Perfiles actualizados','Fallback profiles refreshed':'Perfiles de reserva actualizados',
    'Lorebooks refreshed':'Lorebooks actualizados','System prompt reset to default':'Prompt del sistema restablecido',
    'Prompt copied':'Prompt copiado','Schema reset to default':'Esquema restablecido',
    'Schema copied':'Esquema copiado','Done':'Hecho','Failed':'Fallido',
    'Data cleared':'Datos limpiados','Cleared':'Limpiado','Settings reset to defaults':'Ajustes restablecidos',
    'SP Log copied':'Registro SP copiado','Console copied':'Consola copiada',
    'Copy failed':'Error al copiar','No API response captured yet':'Sin respuesta API capturada',
    'Last response copied':'Última respuesta copiada','Debug log copied':'Registro de depuración copiado',
    'Invalid JSON':'JSON inválido',
    // Story ideas
    'Story direction sent':'Dirección de historia enviada','Story idea copied':'Idea de historia copiada',
    // Custom panels
    'Panel name':'Nombre del panel','Key':'Clave','Label':'Etiqueta','Type':'Tipo','LLM Hint':'Pista LLM',
    'Add Field':'Añadir campo','Delete panel':'Eliminar panel','Remove this field':'Eliminar campo',
    'Drag to reorder':'Arrastrar para reordenar','No custom panels yet':'Sin paneles personalizados',
    // Quest dialog
    'Quest name':'Nombre de misión','1-2 sentences from your perspective':'1-2 oraciones desde tu perspectiva',
},
'French': {
    'Scene Details':'Détails de scène','Quest Journal':'Journal de quêtes','Relationships':'Relations','Characters':'Personnages',
    'Story Ideas':'Idées d\'histoire','Inner Thoughts':'Pensées intérieures','North Star':'Étoile polaire','Main Quests':'Quêtes principales',
    'Side Quests':'Quêtes secondaires','Active Tasks':'Tâches actives',
    'new':'nouveau','updated':'mis à jour','resolved':'résolu',
    'Add quest':'Ajouter quête','Cancel':'Annuler','Add Quest':'Ajouter','Regenerate all':'Tout régénérer',
    'No scene data yet':'Aucune donnée de scène','Not yet revealed':'Pas encore révélé',
    'Name':'Nom','Urgency':'Urgence','Details':'Détails','Critical':'Critique','High':'Haute','Moderate':'Moyenne','Low':'Basse',
    'Generating Scene':'Génération de scène','Language':'Langue','Auto-detect':'Auto-détecter',
    'Mark as completed':'Marquer terminée','Remove quest':'Supprimer quête','Restore quest':'Restaurer quête',
    'Stop Generation':'■ Arrêter','Jump to latest':'Aller au dernier','Copy':'Copier',
    'Toggle edit mode':'Mode édition','Show empty fields':'Afficher champs vides',
    'Snap to left of chat':'Fixer à gauche','Ghost mode':'Mode fantôme','Regenerate thoughts':'Régénérer pensées',
    'Hide thoughts':'Masquer pensées','Hide panel':'Masquer panneau','Panel Manager':'Gestionnaire de panneaux',
    'Updating thoughts':'Mise à jour des pensées','Analyzing context':'Analyse du contexte',
    'General':'Général','Font scale':'Échelle de police',
    'Enable ScenePulse':'Activer ScenePulse','Auto-generate on AI messages':'Auto-générer sur messages IA',
    'Show thought bubbles':'Afficher bulles de pensée','Weather overlay effects':'Effets météo',
    'Time-of-day ambience':'Ambiance horaire','Show developer tools':'Outils de développement',
    'Payload Inspector':'Inspecteur de données','Changes Only':'Changements uniquement','Full Diff':'Comparaison complète',
    'Side by Side':'Côte à côte','Delta Payload':'Delta','Previous':'Précédent','Current':'Actuel','Full Payload':'Données complètes',
    'Completed':'Terminée','Removed':'Supprimée','Added':'Ajoutée','Regenerated':'Régénéré','Regeneration failed':'Échec de régénération',
    'Remove Quest':'Supprimer quête','Copied!':'Copié !',
    // Field labels — scene
    'Topic':'Sujet','Mood':'Humeur','Interaction':'Interaction','Tension':'Tension',
    'Summary':'Résumé','Sounds':'Sons','Present':'Présents',
    // Field labels — character appearance
    'Hair':'Cheveux','Face':'Visage','Outfit':'Tenue','Dress':'Habillement','Posture':'Posture',
    'Proximity':'Proximité','Physical':'État physique','Inventory':'Inventaire',
    // Field labels — goals
    'Need':'Besoin','Short-Term':'Court terme','Long-Term':'Long terme',
    // Field labels — relationship meta
    'Time Known':'Temps connu','Milestone':'Jalon',
    // Field labels — meters
    'Affection':'Affection','Trust':'Confiance','Desire':'Désir','Stress':'Stress','Compat':'Compat.',
    // Field labels — fertility
    'Status':'Statut','Reason':'Raison','Cycle Phase':'Phase du cycle','Cycle Day':'Jour du cycle',
    'Window':'Fenêtre','Pregnancy':'Grossesse','Preg. Week':'Sem. grossesse','Notes':'Notes',
    'Fertility: N/A':'Fertilité : N/A',
    // Stats footer
    'Together':'Ensemble','Separate':'Séparé','Inspect':'Inspecter',
    'Auto':'Auto','Backup':'Sauvegarde','Fallback':'Secours','Full regen':'Régén. complète','Settings':'Paramètres',
    'Msg regen':'Régén. message','Thoughts':'Pensées',
    'Message index':'Index de message','Estimated tokens':'Tokens estimés','Generation time':'Temps de génération',
    // Panel Manager
    'Enable All':'Tout activer','Disable All':'Tout désactiver','Custom Panels':'Panneaux personnalisés',
    '+ Add Custom Panel':'+ Ajouter un panneau',
    'Expand/Collapse sections':'Développer/Réduire sections','Condense view':'Vue condensée',
    // Edit mode
    'Click any highlighted field to edit':'Cliquez sur un champ en surbrillance pour modifier',
    'Edit Mode On':'Mode édition activé','Edit Mode Off':'Mode édition désactivé',
    // Mobile
    'Scene updated':'Scène mise à jour','Open ScenePulse':'Ouvrir ScenePulse',
    // Loading
    'Updating scene data':'Mise à jour des données','Reading context and analyzing characters':'Lecture du contexte et analyse des personnages',
    // Settings sections/labels
    'Setup Guide':'Guide d\'installation','Guided Tour':'Visite guidée','Context msgs':'Messages de contexte',
    'Max retries':'Max tentatives','Delta mode':'Mode delta','Injection Method':'Méthode d\'injection',
    'Mode':'Mode','Fallback Recovery':'Récupération de secours',
    'Enable automatic fallback':'Activer secours automatique','Fallback Profile':'Profil de secours',
    'Fallback Preset':'Preset de secours','Refresh Profiles':'Actualiser profils',
    'Connection Profile':'Profil de connexion','Chat Completion Preset':'Preset de complétion',
    'Prompt Mode':'Mode de prompt','Context Embedding':'Intégration de contexte',
    'Embed snapshots':'Intégrer snapshots','Embed as role':'Intégrer comme rôle',
    'System':'Système','User':'Utilisateur','Assistant':'Assistant',
    'Lorebooks':'Lorebooks','Filter Mode':'Mode de filtre','Refresh Lorebooks':'Actualiser lorebooks',
    'System Prompt':'Prompt système','JSON Schema':'Schéma JSON','Reset to Default':'Réinitialiser',
    'Actions':'Actions','Generate':'Générer','Clear Data':'Effacer données','Reset Settings':'Réinitialiser paramètres',
    'Debug':'Débogage','SP Log':'Journal SP','View Log':'Voir journal','Console':'Console',
    'Last Response':'Dernière réponse','Active':'Actif','Off':'Désactivé',
    // Toast messages
    'Profiles refreshed':'Profils actualisés','Fallback profiles refreshed':'Profils de secours actualisés',
    'Lorebooks refreshed':'Lorebooks actualisés','System prompt reset to default':'Prompt système réinitialisé',
    'Prompt copied':'Prompt copié','Schema reset to default':'Schéma réinitialisé',
    'Schema copied':'Schéma copié','Done':'Terminé','Failed':'Échoué',
    'Data cleared':'Données effacées','Cleared':'Effacé','Settings reset to defaults':'Paramètres réinitialisés',
    'SP Log copied':'Journal SP copié','Console copied':'Console copiée',
    'Copy failed':'Échec de copie','No API response captured yet':'Aucune réponse API capturée',
    'Last response copied':'Dernière réponse copiée','Debug log copied':'Journal de débogage copié',
    'Invalid JSON':'JSON invalide',
    // Story ideas
    'Story direction sent':'Direction d\'histoire envoyée','Story idea copied':'Idée d\'histoire copiée',
    // Custom panels
    'Panel name':'Nom du panneau','Key':'Clé','Label':'Libellé','Type':'Type','LLM Hint':'Indice LLM',
    'Add Field':'Ajouter champ','Delete panel':'Supprimer panneau','Remove this field':'Supprimer ce champ',
    'Drag to reorder':'Glisser pour réordonner','No custom panels yet':'Aucun panneau personnalisé',
    // Quest dialog
    'Quest name':'Nom de quête','1-2 sentences from your perspective':'1-2 phrases de votre point de vue',
},
'German': {
    'Scene Details':'Szenendetails','Quest Journal':'Questtagebuch','Relationships':'Beziehungen','Characters':'Charaktere',
    'Story Ideas':'Story-Ideen','Inner Thoughts':'Innere Gedanken','North Star':'Leitstern','Main Quests':'Hauptquests',
    'Side Quests':'Nebenquests','Active Tasks':'Aktive Aufgaben',
    'new':'neu','updated':'aktualis.','resolved':'erledigt',
    'Add quest':'Quest hinzufügen','Cancel':'Abbrechen','Add Quest':'Hinzufügen','Regenerate all':'Alles neu generieren',
    'No scene data yet':'Keine Szenendaten','Not yet revealed':'Noch nicht enthüllt',
    'Name':'Name','Urgency':'Dringlichkeit','Details':'Details','Critical':'Kritisch','High':'Hoch','Moderate':'Mittel','Low':'Niedrig',
    'Generating Scene':'Szene wird generiert','Language':'Sprache','Auto-detect':'Auto-Erkennung',
    'Mark as completed':'Als erledigt markieren','Remove quest':'Quest entfernen','Restore quest':'Quest wiederherstellen',
    'Stop Generation':'■ Stopp','Jump to latest':'Zum neuesten','Copy':'Kopieren',
    'Toggle edit mode':'Bearbeitungsmodus','Show empty fields':'Leere Felder anzeigen',
    'Snap to left of chat':'Links am Chat fixieren','Ghost mode':'Geistermodus','Regenerate thoughts':'Gedanken regenerieren',
    'Hide thoughts':'Gedanken ausblenden','Hide panel':'Panel ausblenden','Panel Manager':'Panel-Verwaltung',
    'Updating thoughts':'Gedanken werden aktualisiert','Analyzing context':'Kontext wird analysiert',
    'General':'Allgemein','Font scale':'Schriftgröße',
    'Enable ScenePulse':'ScenePulse aktivieren','Auto-generate on AI messages':'Auto-Generierung bei KI-Nachrichten',
    'Show thought bubbles':'Gedankenblasen anzeigen','Weather overlay effects':'Wettereffekte',
    'Time-of-day ambience':'Tageszeit-Ambiente','Show developer tools':'Entwicklertools anzeigen',
    'Payload Inspector':'Dateninspektor','Changes Only':'Nur Änderungen','Full Diff':'Vollständiger Vergleich',
    'Side by Side':'Nebeneinander','Delta Payload':'Delta','Previous':'Vorheriger','Current':'Aktuell','Full Payload':'Vollständige Daten',
    'Completed':'Erledigt','Removed':'Entfernt','Added':'Hinzugefügt','Regenerated':'Regeneriert','Regeneration failed':'Regenerierung fehlgeschlagen',
    'Remove Quest':'Quest entfernen','Copied!':'Kopiert!',
    // Field labels — scene
    'Topic':'Thema','Mood':'Stimmung','Interaction':'Interaktion','Tension':'Spannung',
    'Summary':'Zusammenfassung','Sounds':'Geräusche','Present':'Anwesend',
    // Field labels — character appearance
    'Hair':'Haare','Face':'Gesicht','Outfit':'Outfit','Dress':'Kleidung','Posture':'Haltung',
    'Proximity':'Nähe','Physical':'Körperlich','Inventory':'Inventar',
    // Field labels — goals
    'Need':'Bedürfnis','Short-Term':'Kurzfristig','Long-Term':'Langfristig',
    // Field labels — relationship meta
    'Time Known':'Bekannt seit','Milestone':'Meilenstein',
    // Field labels — meters
    'Affection':'Zuneigung','Trust':'Vertrauen','Desire':'Verlangen','Stress':'Stress','Compat':'Kompatib.',
    // Field labels — fertility
    'Status':'Status','Reason':'Grund','Cycle Phase':'Zyklusphase','Cycle Day':'Zyklustag',
    'Window':'Fenster','Pregnancy':'Schwangerschaft','Preg. Week':'Schwang.-Woche','Notes':'Notizen',
    'Fertility: N/A':'Fruchtbarkeit: N/A',
    // Stats footer
    'Together':'Zusammen','Separate':'Getrennt','Inspect':'Inspizieren',
    'Auto':'Auto','Backup':'Sicherung','Fallback':'Ausweich','Full regen':'Vollständige Regen.','Settings':'Einstellungen',
    'Msg regen':'Nachr.-Regen.','Thoughts':'Gedanken',
    'Message index':'Nachrichtenindex','Estimated tokens':'Geschätzte Token','Generation time':'Generierungszeit',
    // Panel Manager
    'Enable All':'Alle aktivieren','Disable All':'Alle deaktivieren','Custom Panels':'Benutzerdefinierte Panels',
    '+ Add Custom Panel':'+ Panel hinzufügen',
    'Expand/Collapse sections':'Sektionen auf-/zuklappen','Condense view':'Kompakte Ansicht',
    // Edit mode
    'Click any highlighted field to edit':'Klicken Sie auf ein markiertes Feld zum Bearbeiten',
    'Edit Mode On':'Bearbeitungsmodus an','Edit Mode Off':'Bearbeitungsmodus aus',
    // Mobile
    'Scene updated':'Szene aktualisiert','Open ScenePulse':'ScenePulse öffnen',
    // Loading
    'Updating scene data':'Szenendaten werden aktualisiert','Reading context and analyzing characters':'Kontext lesen und Charaktere analysieren',
    // Settings sections/labels
    'Setup Guide':'Einrichtungshilfe','Guided Tour':'Geführte Tour','Context msgs':'Kontextnachrichten',
    'Max retries':'Max. Versuche','Delta mode':'Delta-Modus','Injection Method':'Injektionsmethode',
    'Mode':'Modus','Fallback Recovery':'Ausweich-Wiederherstellung',
    'Enable automatic fallback':'Automatisches Ausweichen','Fallback Profile':'Ausweich-Profil',
    'Fallback Preset':'Ausweich-Preset','Refresh Profiles':'Profile aktualisieren',
    'Connection Profile':'Verbindungsprofil','Chat Completion Preset':'Chat-Vervollständigungs-Preset',
    'Prompt Mode':'Prompt-Modus','Context Embedding':'Kontexteinbettung',
    'Embed snapshots':'Snapshots einbetten','Embed as role':'Als Rolle einbetten',
    'System':'System','User':'Benutzer','Assistant':'Assistent',
    'Lorebooks':'Lorebooks','Filter Mode':'Filtermodus','Refresh Lorebooks':'Lorebooks aktualisieren',
    'System Prompt':'System-Prompt','JSON Schema':'JSON-Schema','Reset to Default':'Zurücksetzen',
    'Actions':'Aktionen','Generate':'Generieren','Clear Data':'Daten löschen','Reset Settings':'Einstellungen zurücksetzen',
    'Debug':'Debug','SP Log':'SP-Protokoll','View Log':'Protokoll anzeigen','Console':'Konsole',
    'Last Response':'Letzte Antwort','Active':'Aktiv','Off':'Aus',
    // Toast messages
    'Profiles refreshed':'Profile aktualisiert','Fallback profiles refreshed':'Ausweich-Profile aktualisiert',
    'Lorebooks refreshed':'Lorebooks aktualisiert','System prompt reset to default':'System-Prompt zurückgesetzt',
    'Prompt copied':'Prompt kopiert','Schema reset to default':'Schema zurückgesetzt',
    'Schema copied':'Schema kopiert','Done':'Fertig','Failed':'Fehlgeschlagen',
    'Data cleared':'Daten gelöscht','Cleared':'Gelöscht','Settings reset to defaults':'Einstellungen zurückgesetzt',
    'SP Log copied':'SP-Protokoll kopiert','Console copied':'Konsole kopiert',
    'Copy failed':'Kopieren fehlgeschlagen','No API response captured yet':'Keine API-Antwort erfasst',
    'Last response copied':'Letzte Antwort kopiert','Debug log copied':'Debug-Protokoll kopiert',
    'Invalid JSON':'Ungültiges JSON',
    // Story ideas
    'Story direction sent':'Story-Richtung gesendet','Story idea copied':'Story-Idee kopiert',
    // Custom panels
    'Panel name':'Panel-Name','Key':'Schlüssel','Label':'Bezeichnung','Type':'Typ','LLM Hint':'LLM-Hinweis',
    'Add Field':'Feld hinzufügen','Delete panel':'Panel löschen','Remove this field':'Feld entfernen',
    'Drag to reorder':'Ziehen zum Sortieren','No custom panels yet':'Keine benutzerdefinierten Panels',
    // Quest dialog
    'Quest name':'Questname','1-2 sentences from your perspective':'1-2 Sätze aus Ihrer Perspektive',
},
'Portuguese': {
    'Scene Details':'Detalhes da cena','Quest Journal':'Diário de missões','Relationships':'Relacionamentos','Characters':'Personagens',
    'Story Ideas':'Ideias de história','Inner Thoughts':'Pensamentos internos','North Star':'Estrela guia','Main Quests':'Missões principais',
    'Side Quests':'Missões secundárias','Active Tasks':'Tarefas ativas',
    'new':'novo','updated':'atualiz.','resolved':'resolvido',
    'Add quest':'Adicionar missão','Cancel':'Cancelar','Add Quest':'Adicionar','Regenerate all':'Regenerar tudo',
    'No scene data yet':'Sem dados de cena','Not yet revealed':'Ainda não revelado',
    'Name':'Nome','Urgency':'Urgência','Details':'Detalhes','Critical':'Crítica','High':'Alta','Moderate':'Média','Low':'Baixa',
    'Generating Scene':'Gerando cena','Language':'Idioma','Auto-detect':'Auto-detectar',
    'Mark as completed':'Marcar como concluída','Remove quest':'Remover missão','Restore quest':'Restaurar missão',
    'Stop Generation':'■ Parar','Jump to latest':'Ir ao mais recente','Copy':'Copiar',
    'Toggle edit mode':'Modo de edição','Show empty fields':'Mostrar campos vazios',
    'Snap to left of chat':'Fixar à esquerda','Ghost mode':'Modo fantasma','Regenerate thoughts':'Regenerar pensamentos',
    'Hide thoughts':'Ocultar pensamentos','Hide panel':'Ocultar painel','Panel Manager':'Gerenciador de painéis',
    'Updating thoughts':'Atualizando pensamentos','Analyzing context':'Analisando contexto',
    'General':'Geral','Font scale':'Escala da fonte',
    'Enable ScenePulse':'Ativar ScenePulse','Auto-generate on AI messages':'Auto-gerar com mensagens IA',
    'Show thought bubbles':'Mostrar balões de pensamento','Weather overlay effects':'Efeitos de clima',
    'Time-of-day ambience':'Ambiente do horário','Show developer tools':'Ferramentas de desenvolvimento',
    'Payload Inspector':'Inspetor de dados','Changes Only':'Apenas mudanças','Full Diff':'Comparação completa',
    'Side by Side':'Lado a lado','Delta Payload':'Delta','Previous':'Anterior','Current':'Atual','Full Payload':'Dados completos',
    'Completed':'Concluída','Removed':'Removida','Added':'Adicionada','Regenerated':'Regenerado','Regeneration failed':'Falha na regeneração',
    'Remove Quest':'Remover missão','Copied!':'Copiado!',
    // Field labels — scene
    'Topic':'Tópico','Mood':'Humor','Interaction':'Interação','Tension':'Tensão',
    'Summary':'Resumo','Sounds':'Sons','Present':'Presentes',
    // Field labels — character appearance
    'Hair':'Cabelo','Face':'Rosto','Outfit':'Roupa','Dress':'Vestimenta','Posture':'Postura',
    'Proximity':'Proximidade','Physical':'Estado físico','Inventory':'Inventário',
    // Field labels — goals
    'Need':'Necessidade','Short-Term':'Curto prazo','Long-Term':'Longo prazo',
    // Field labels — relationship meta
    'Time Known':'Tempo conhecido','Milestone':'Marco',
    // Field labels — meters
    'Affection':'Afeição','Trust':'Confiança','Desire':'Desejo','Stress':'Estresse','Compat':'Compat.',
    // Field labels — fertility
    'Status':'Estado','Reason':'Razão','Cycle Phase':'Fase do ciclo','Cycle Day':'Dia do ciclo',
    'Window':'Janela','Pregnancy':'Gravidez','Preg. Week':'Sem. gravidez','Notes':'Notas',
    'Fertility: N/A':'Fertilidade: N/A',
    // Stats footer
    'Together':'Junto','Separate':'Separado','Inspect':'Inspecionar',
    'Auto':'Auto','Backup':'Backup','Fallback':'Reserva','Full regen':'Regen. completa','Settings':'Configurações',
    'Msg regen':'Regen. mensagem','Thoughts':'Pensamentos',
    'Message index':'Índice da mensagem','Estimated tokens':'Tokens estimados','Generation time':'Tempo de geração',
    // Panel Manager
    'Enable All':'Ativar tudo','Disable All':'Desativar tudo','Custom Panels':'Painéis personalizados',
    '+ Add Custom Panel':'+ Adicionar painel',
    'Expand/Collapse sections':'Expandir/Recolher seções','Condense view':'Vista condensada',
    // Edit mode
    'Click any highlighted field to edit':'Clique em qualquer campo destacado para editar',
    'Edit Mode On':'Modo edição ativado','Edit Mode Off':'Modo edição desativado',
    // Mobile
    'Scene updated':'Cena atualizada','Open ScenePulse':'Abrir ScenePulse',
    // Loading
    'Updating scene data':'Atualizando dados da cena','Reading context and analyzing characters':'Lendo contexto e analisando personagens',
    // Settings sections/labels
    'Setup Guide':'Guia de configuração','Guided Tour':'Tour guiado','Context msgs':'Mensagens de contexto',
    'Max retries':'Máx. tentativas','Delta mode':'Modo delta','Injection Method':'Método de injeção',
    'Mode':'Modo','Fallback Recovery':'Recuperação de reserva',
    'Enable automatic fallback':'Ativar reserva automática','Fallback Profile':'Perfil de reserva',
    'Fallback Preset':'Preset de reserva','Refresh Profiles':'Atualizar perfis',
    'Connection Profile':'Perfil de conexão','Chat Completion Preset':'Preset de completude',
    'Prompt Mode':'Modo de prompt','Context Embedding':'Incorporação de contexto',
    'Embed snapshots':'Incorporar snapshots','Embed as role':'Incorporar como papel',
    'System':'Sistema','User':'Usuário','Assistant':'Assistente',
    'Lorebooks':'Lorebooks','Filter Mode':'Modo de filtro','Refresh Lorebooks':'Atualizar lorebooks',
    'System Prompt':'Prompt do sistema','JSON Schema':'Esquema JSON','Reset to Default':'Restaurar padrão',
    'Actions':'Ações','Generate':'Gerar','Clear Data':'Limpar dados','Reset Settings':'Redefinir configurações',
    'Debug':'Depuração','SP Log':'Log SP','View Log':'Ver log','Console':'Console',
    'Last Response':'Última resposta','Active':'Ativo','Off':'Desligado',
    // Toast messages
    'Profiles refreshed':'Perfis atualizados','Fallback profiles refreshed':'Perfis de reserva atualizados',
    'Lorebooks refreshed':'Lorebooks atualizados','System prompt reset to default':'Prompt do sistema restaurado',
    'Prompt copied':'Prompt copiado','Schema reset to default':'Esquema restaurado',
    'Schema copied':'Esquema copiado','Done':'Concluído','Failed':'Falhou',
    'Data cleared':'Dados limpos','Cleared':'Limpo','Settings reset to defaults':'Configurações restauradas',
    'SP Log copied':'Log SP copiado','Console copied':'Console copiado',
    'Copy failed':'Falha ao copiar','No API response captured yet':'Nenhuma resposta API capturada',
    'Last response copied':'Última resposta copiada','Debug log copied':'Log de depuração copiado',
    'Invalid JSON':'JSON inválido',
    // Story ideas
    'Story direction sent':'Direção da história enviada','Story idea copied':'Ideia de história copiada',
    // Custom panels
    'Panel name':'Nome do painel','Key':'Chave','Label':'Rótulo','Type':'Tipo','LLM Hint':'Dica LLM',
    'Add Field':'Adicionar campo','Delete panel':'Excluir painel','Remove this field':'Remover campo',
    'Drag to reorder':'Arrastar para reordenar','No custom panels yet':'Nenhum painel personalizado',
    // Quest dialog
    'Quest name':'Nome da missão','1-2 sentences from your perspective':'1-2 frases da sua perspectiva',
},
'Chinese (Traditional)': {
    // Section headers
    'Scene Details':'場景詳情','Quest Journal':'任務日誌','Relationships':'關係',
    'Characters':'角色','Story Ideas':'劇情構想','Inner Thoughts':'內心想法',
    'North Star':'北極星','Main Quests':'主線任務','Side Quests':'支線任務',
    'Active Tasks':'當前任務',
    // Badges
    'new':'新','updated':'更新','resolved':'完成',
    // Buttons & actions
    'Add quest':'新增任務','Cancel':'取消','Add Quest':'新增','Regenerate all':'全部重新產生',
    'Mark as completed':'標記完成','Remove quest':'刪除任務','Restore quest':'恢復任務',
    'Stop Generation':'■ 停止產生','Jump to latest':'跳至最新','Copy':'複製',
    // Empty states
    'No scene data yet':'尚無場景資料','Send a message or click ⟳ to generate.':'傳送訊息或點擊 ⟳ 產生。',
    'No active storyline quests':'無進行中的主線任務','No side quests discovered':'未發現支線任務',
    'No immediate tasks':'無緊急任務','Not yet revealed':'尚未揭示',
    // Form labels
    'Name':'名稱','Urgency':'緊急程度','Details':'詳情','Critical':'緊急','High':'高','Moderate':'中','Low':'低',
    // Tooltips
    'Toggle edit mode':'切換編輯模式','Show empty fields':'顯示空欄位',
    'Snap to left of chat':'固定於聊天左側','Ghost mode':'幽靈模式','Regenerate thoughts':'重新產生想法',
    'Hide thoughts':'隱藏想法','Hide panel':'隱藏面板','Panel Manager':'面板管理器',
    // Loading
    'Generating Scene':'產生場景中','Updating thoughts':'更新想法中','Analyzing context':'分析上下文中',
    // Diff viewer
    'Payload Inspector':'資料檢查器','Changes Only':'僅變更','Full Diff':'完整對比',
    'Side by Side':'並排顯示','Delta Payload':'增量','Previous':'上一個','Current':'目前','Full Payload':'完整資料',
    // Toasts
    'Completed':'已完成','Removed':'已刪除','Added':'已新增','Regenerated':'已重新產生','Regeneration failed':'重新產生失敗',
    'Remove Quest':'刪除任務','Copied!':'已複製！',
    // Settings
    'General':'一般','Enable ScenePulse':'啟用 ScenePulse','Auto-generate on AI messages':'AI 訊息自動產生',
    'Show thought bubbles':'顯示思考氣泡','Weather overlay effects':'天氣覆蓋效果','Time-of-day ambience':'時段氛圍',
    'Font scale':'字型縮放','Language':'語言','Auto-detect':'自動偵測',
    'Show developer tools':'顯示開發者工具',
    // Field labels — scene
    'Topic':'話題','Mood':'情緒','Interaction':'互動','Tension':'緊張度',
    'Summary':'摘要','Sounds':'聲音','Present':'在場',
    // Field labels — character appearance
    'Hair':'髮型','Face':'面部','Outfit':'服裝','Dress':'穿著狀態','Posture':'姿態',
    'Proximity':'距離','Physical':'身體狀態','Inventory':'物品欄',
    // Field labels — goals
    'Need':'需求','Short-Term':'短期','Long-Term':'長期',
    // Field labels — relationship meta
    'Time Known':'認識時間','Milestone':'里程碑',
    // Field labels — meters
    'Affection':'感情','Trust':'信任','Desire':'慾望','Stress':'壓力','Compat':'相容',
    // Field labels — fertility
    'Status':'狀態','Reason':'原因','Cycle Phase':'週期階段','Cycle Day':'週期天數',
    'Window':'窗口期','Pregnancy':'懷孕','Preg. Week':'孕週','Notes':'備註',
    'Fertility: N/A':'生育：不適用',
    // Stats footer
    'Together':'合併','Separate':'分離','Inspect':'檢查',
    'Auto':'自動','Backup':'備份','Fallback':'回退','Full regen':'完全重新產生','Settings':'設定',
    'Msg regen':'訊息重新產生','Thoughts':'想法',
    'Message index':'訊息索引','Estimated tokens':'預估令牌數','Generation time':'產生時間',
    // Panel Manager
    'Enable All':'全部啟用','Disable All':'全部停用','Custom Panels':'自訂面板',
    '+ Add Custom Panel':'+ 新增自訂面板',
    'Expand/Collapse sections':'展開/摺疊區域','Condense view':'精簡檢視',
    // Edit mode
    'Click any highlighted field to edit':'點擊醒目標示的欄位進行編輯',
    'Edit Mode On':'編輯模式開啟','Edit Mode Off':'編輯模式關閉',
    // Mobile
    'Scene updated':'場景已更新','Open ScenePulse':'開啟 ScenePulse',
    // Loading
    'Updating scene data':'正在更新場景資料','Reading context and analyzing characters':'正在讀取上下文並分析角色',
    // Settings sections/labels
    'Setup Guide':'設定指南','Guided Tour':'導覽教學','Context msgs':'上下文訊息',
    'Max retries':'最大重試','Delta mode':'增量模式','Injection Method':'注入方式',
    'Mode':'模式','Fallback Recovery':'回退恢復',
    'Enable automatic fallback':'啟用自動回退','Fallback Profile':'回退設定檔',
    'Fallback Preset':'回退預設','Refresh Profiles':'重新整理設定檔',
    'Connection Profile':'連線設定檔','Chat Completion Preset':'聊天補全預設',
    'Prompt Mode':'提示模式','Context Embedding':'上下文嵌入',
    'Embed snapshots':'嵌入快照','Embed as role':'嵌入角色',
    'System':'系統','User':'使用者','Assistant':'助理',
    'Lorebooks':'知識庫','Filter Mode':'篩選模式','Refresh Lorebooks':'重新整理知識庫',
    'System Prompt':'系統提示','JSON Schema':'JSON 架構','Reset to Default':'恢復預設',
    'Actions':'操作','Generate':'產生','Clear Data':'清除資料','Reset Settings':'重設設定',
    'Debug':'除錯','SP Log':'SP 日誌','View Log':'檢視日誌','Console':'主控台',
    'Last Response':'上次回應','Active':'啟用','Off':'關閉',
    // Toast messages
    'Profiles refreshed':'設定檔已重新整理','Fallback profiles refreshed':'回退設定檔已重新整理',
    'Lorebooks refreshed':'知識庫已重新整理','System prompt reset to default':'系統提示已重設',
    'Prompt copied':'提示已複製','Schema reset to default':'架構已重設',
    'Schema copied':'架構已複製','Done':'完成','Failed':'失敗',
    'Data cleared':'資料已清除','Cleared':'已清除','Settings reset to defaults':'設定已重設',
    'SP Log copied':'SP 日誌已複製','Console copied':'主控台已複製',
    'Copy failed':'複製失敗','No API response captured yet':'尚無 API 回應',
    'Last response copied':'上次回應已複製','Debug log copied':'除錯日誌已複製',
    'Invalid JSON':'無效 JSON',
    // Story ideas
    'Story direction sent':'故事方向已傳送','Story idea copied':'劇情構想已複製',
    // Custom panels
    'Panel name':'面板名稱','Key':'鍵','Label':'標籤','Type':'類型','LLM Hint':'LLM 提示',
    'Add Field':'新增欄位','Delete panel':'刪除面板','Remove this field':'移除欄位',
    'Drag to reorder':'拖曳排序','No custom panels yet':'尚無自訂面板',
    // Quest dialog
    'Quest name':'任務名稱','1-2 sentences from your perspective':'從您的角度寫 1-2 句話',
},
'Hindi': {
    // Section headers
    'Scene Details':'दृश्य विवरण','Quest Journal':'क्वेस्ट जर्नल','Relationships':'रिश्ते',
    'Characters':'पात्र','Story Ideas':'कहानी विचार','Inner Thoughts':'आंतरिक विचार',
    'North Star':'ध्रुव तारा','Main Quests':'मुख्य क्वेस्ट','Side Quests':'सहायक क्वेस्ट',
    'Active Tasks':'सक्रिय कार्य',
    // Badges
    'new':'नया','updated':'अपडेट','resolved':'हल',
    // Buttons & actions
    'Add quest':'क्वेस्ट जोड़ें','Cancel':'रद्द करें','Add Quest':'जोड़ें','Regenerate all':'सब पुनः बनाएँ',
    'Mark as completed':'पूर्ण चिह्नित करें','Remove quest':'क्वेस्ट हटाएँ','Restore quest':'क्वेस्ट पुनर्स्थापित करें',
    'Stop Generation':'■ रोकें','Jump to latest':'नवीनतम पर जाएँ','Copy':'कॉपी करें',
    // Empty states
    'No scene data yet':'अभी कोई दृश्य डेटा नहीं','Send a message or click ⟳ to generate.':'संदेश भेजें या ⟳ क्लिक करें।',
    'No active storyline quests':'कोई सक्रिय कथा क्वेस्ट नहीं','No side quests discovered':'कोई सहायक क्वेस्ट नहीं',
    'No immediate tasks':'कोई तत्काल कार्य नहीं','Not yet revealed':'अभी प्रकट नहीं हुआ',
    // Form labels
    'Name':'नाम','Urgency':'तात्कालिकता','Details':'विवरण','Critical':'गंभीर','High':'उच्च','Moderate':'मध्यम','Low':'निम्न',
    // Tooltips
    'Toggle edit mode':'संपादन मोड टॉगल करें','Show empty fields':'खाली फ़ील्ड दिखाएँ',
    'Snap to left of chat':'चैट के बाईं ओर स्नैप करें','Ghost mode':'भूत मोड','Regenerate thoughts':'विचार पुनः बनाएँ',
    'Hide thoughts':'विचार छिपाएँ','Hide panel':'पैनल छिपाएँ','Panel Manager':'पैनल प्रबंधक',
    // Loading
    'Generating Scene':'दृश्य बनाया जा रहा है','Updating thoughts':'विचार अपडेट हो रहे हैं','Analyzing context':'संदर्भ विश्लेषण',
    // Diff viewer
    'Payload Inspector':'पेलोड निरीक्षक','Changes Only':'केवल बदलाव','Full Diff':'पूर्ण तुलना',
    'Side by Side':'साथ-साथ','Delta Payload':'डेल्टा','Previous':'पिछला','Current':'वर्तमान','Full Payload':'पूर्ण डेटा',
    // Toasts
    'Completed':'पूर्ण','Removed':'हटाया','Added':'जोड़ा गया','Regenerated':'पुनः बनाया','Regeneration failed':'पुनर्जनन विफल',
    'Remove Quest':'क्वेस्ट हटाएँ','Copied!':'कॉपी हो गया!',
    // Settings
    'General':'सामान्य','Enable ScenePulse':'ScenePulse सक्षम करें','Auto-generate on AI messages':'AI संदेशों पर स्वतः बनाएँ',
    'Show thought bubbles':'विचार बुलबुले दिखाएँ','Weather overlay effects':'मौसम ओवरले प्रभाव','Time-of-day ambience':'दिन के समय का माहौल',
    'Font scale':'फ़ॉन्ट स्केल','Language':'भाषा','Auto-detect':'स्वतः पहचान',
    'Show developer tools':'डेवलपर टूल दिखाएँ',
    // Field labels — scene
    'Topic':'विषय','Mood':'मनोदशा','Interaction':'बातचीत','Tension':'तनाव',
    'Summary':'सारांश','Sounds':'ध्वनियाँ','Present':'उपस्थित',
    // Field labels — character appearance
    'Hair':'बाल','Face':'चेहरा','Outfit':'पोशाक','Dress':'वेशभूषा','Posture':'मुद्रा',
    'Proximity':'निकटता','Physical':'शारीरिक','Inventory':'सामग्री',
    // Field labels — goals
    'Need':'आवश्यकता','Short-Term':'अल्पकालिक','Long-Term':'दीर्घकालिक',
    // Field labels — relationship meta
    'Time Known':'परिचय अवधि','Milestone':'मील का पत्थर',
    // Field labels — meters
    'Affection':'स्नेह','Trust':'विश्वास','Desire':'इच्छा','Stress':'तनाव','Compat':'अनुकूलता',
    // Field labels — fertility
    'Status':'स्थिति','Reason':'कारण','Cycle Phase':'चक्र चरण','Cycle Day':'चक्र दिवस',
    'Window':'विंडो','Pregnancy':'गर्भावस्था','Preg. Week':'गर्भ सप्ताह','Notes':'टिप्पणियाँ',
    'Fertility: N/A':'प्रजनन: लागू नहीं',
    // Stats footer
    'Together':'संयुक्त','Separate':'अलग','Inspect':'निरीक्षण',
    'Auto':'ऑटो','Backup':'बैकअप','Fallback':'फ़ॉलबैक','Full regen':'पूर्ण पुनर्जनन','Settings':'सेटिंग्स',
    'Msg regen':'संदेश पुनर्जनन','Thoughts':'विचार',
    'Message index':'संदेश अनुक्रमणिका','Estimated tokens':'अनुमानित टोकन','Generation time':'जनन समय',
    // Panel Manager
    'Enable All':'सभी सक्षम','Disable All':'सभी अक्षम','Custom Panels':'कस्टम पैनल',
    '+ Add Custom Panel':'+ कस्टम पैनल जोड़ें',
    'Expand/Collapse sections':'अनुभाग खोलें/बंद करें','Condense view':'संक्षिप्त दृश्य',
    // Edit mode
    'Click any highlighted field to edit':'संपादित करने के लिए किसी हाइलाइट फ़ील्ड पर क्लिक करें',
    'Edit Mode On':'संपादन मोड चालू','Edit Mode Off':'संपादन मोड बंद',
    // Mobile
    'Scene updated':'दृश्य अपडेट हुआ','Open ScenePulse':'ScenePulse खोलें',
    // Loading
    'Updating scene data':'दृश्य डेटा अपडेट हो रहा है','Reading context and analyzing characters':'संदर्भ पढ़ना और पात्रों का विश्लेषण',
    // Settings sections/labels
    'Setup Guide':'सेटअप गाइड','Guided Tour':'गाइडेड टूर','Context msgs':'संदर्भ संदेश',
    'Max retries':'अधिकतम पुनर्प्रयास','Delta mode':'डेल्टा मोड','Injection Method':'इंजेक्शन विधि',
    'Mode':'मोड','Fallback Recovery':'फ़ॉलबैक पुनर्प्राप्ति',
    'Enable automatic fallback':'स्वचालित फ़ॉलबैक सक्षम','Fallback Profile':'फ़ॉलबैक प्रोफ़ाइल',
    'Fallback Preset':'फ़ॉलबैक प्रीसेट','Refresh Profiles':'प्रोफ़ाइल रिफ़्रेश करें',
    'Connection Profile':'कनेक्शन प्रोफ़ाइल','Chat Completion Preset':'चैट कम्प्लीशन प्रीसेट',
    'Prompt Mode':'प्रॉम्प्ट मोड','Context Embedding':'संदर्भ एम्बेडिंग',
    'Embed snapshots':'स्नैपशॉट एम्बेड करें','Embed as role':'भूमिका के रूप में एम्बेड करें',
    'System':'सिस्टम','User':'उपयोगकर्ता','Assistant':'सहायक',
    'Lorebooks':'लोरबुक्स','Filter Mode':'फ़िल्टर मोड','Refresh Lorebooks':'लोरबुक्स रिफ़्रेश करें',
    'System Prompt':'सिस्टम प्रॉम्प्ट','JSON Schema':'JSON स्कीमा','Reset to Default':'डिफ़ॉल्ट पर रीसेट',
    'Actions':'कार्य','Generate':'जनन','Clear Data':'डेटा साफ़ करें','Reset Settings':'सेटिंग्स रीसेट',
    'Debug':'डीबग','SP Log':'SP लॉग','View Log':'लॉग देखें','Console':'कंसोल',
    'Last Response':'अंतिम प्रतिक्रिया','Active':'सक्रिय','Off':'बंद',
    // Toast messages
    'Profiles refreshed':'प्रोफ़ाइल रिफ़्रेश हुए','Fallback profiles refreshed':'फ़ॉलबैक प्रोफ़ाइल रिफ़्रेश हुए',
    'Lorebooks refreshed':'लोरबुक्स रिफ़्रेश हुए','System prompt reset to default':'सिस्टम प्रॉम्प्ट रीसेट हुआ',
    'Prompt copied':'प्रॉम्प्ट कॉपी हुआ','Schema reset to default':'स्कीमा रीसेट हुआ',
    'Schema copied':'स्कीमा कॉपी हुआ','Done':'हो गया','Failed':'विफल',
    'Data cleared':'डेटा साफ़ हुआ','Cleared':'साफ़ हुआ','Settings reset to defaults':'सेटिंग्स रीसेट हुईं',
    'SP Log copied':'SP लॉग कॉपी हुआ','Console copied':'कंसोल कॉपी हुआ',
    'Copy failed':'कॉपी विफल','No API response captured yet':'अभी कोई API प्रतिक्रिया नहीं',
    'Last response copied':'अंतिम प्रतिक्रिया कॉपी हुई','Debug log copied':'डीबग लॉग कॉपी हुआ',
    'Invalid JSON':'अमान्य JSON',
    // Story ideas
    'Story direction sent':'कहानी दिशा भेजी गई','Story idea copied':'कहानी विचार कॉपी हुआ',
    // Custom panels
    'Panel name':'पैनल नाम','Key':'कुंजी','Label':'लेबल','Type':'प्रकार','LLM Hint':'LLM संकेत',
    'Add Field':'फ़ील्ड जोड़ें','Delete panel':'पैनल हटाएँ','Remove this field':'यह फ़ील्ड हटाएँ',
    'Drag to reorder':'क्रम बदलने हेतु खींचें','No custom panels yet':'अभी कोई कस्टम पैनल नहीं',
    // Quest dialog
    'Quest name':'क्वेस्ट नाम','1-2 sentences from your perspective':'अपने दृष्टिकोण से 1-2 वाक्य',
},
'Arabic': {
    // Section headers
    'Scene Details':'تفاصيل المشهد','Quest Journal':'سجل المهام','Relationships':'العلاقات',
    'Characters':'الشخصيات','Story Ideas':'أفكار القصة','Inner Thoughts':'الأفكار الداخلية',
    'North Star':'النجم القطبي','Main Quests':'المهام الرئيسية','Side Quests':'المهام الفرعية',
    'Active Tasks':'المهام النشطة',
    // Badges
    'new':'جديد','updated':'محدّث','resolved':'مكتمل',
    // Buttons & actions
    'Add quest':'إضافة مهمة','Cancel':'إلغاء','Add Quest':'إضافة','Regenerate all':'إعادة توليد الكل',
    'Mark as completed':'تعيين كمكتمل','Remove quest':'حذف المهمة','Restore quest':'استعادة المهمة',
    'Stop Generation':'■ إيقاف','Jump to latest':'إلى الأحدث','Copy':'نسخ',
    // Empty states
    'No scene data yet':'لا توجد بيانات مشهد بعد','Send a message or click ⟳ to generate.':'أرسل رسالة أو اضغط ⟳ للتوليد.',
    'No active storyline quests':'لا توجد مهام رئيسية نشطة','No side quests discovered':'لم يتم اكتشاف مهام فرعية',
    'No immediate tasks':'لا مهام عاجلة','Not yet revealed':'لم يُكشف بعد',
    // Form labels
    'Name':'الاسم','Urgency':'الإلحاح','Details':'التفاصيل','Critical':'حرج','High':'عالي','Moderate':'متوسط','Low':'منخفض',
    // Tooltips
    'Toggle edit mode':'تبديل وضع التحرير','Show empty fields':'إظهار الحقول الفارغة',
    'Snap to left of chat':'تثبيت يسار الدردشة','Ghost mode':'الوضع الشبحي','Regenerate thoughts':'إعادة توليد الأفكار',
    'Hide thoughts':'إخفاء الأفكار','Hide panel':'إخفاء اللوحة','Panel Manager':'مدير اللوحات',
    // Loading
    'Generating Scene':'جارٍ توليد المشهد','Updating thoughts':'جارٍ تحديث الأفكار','Analyzing context':'جارٍ تحليل السياق',
    // Diff viewer
    'Payload Inspector':'مفتش البيانات','Changes Only':'التغييرات فقط','Full Diff':'مقارنة كاملة',
    'Side by Side':'جنبًا إلى جنب','Delta Payload':'دلتا','Previous':'السابق','Current':'الحالي','Full Payload':'البيانات الكاملة',
    // Toasts
    'Completed':'مكتمل','Removed':'محذوف','Added':'مُضاف','Regenerated':'أُعيد توليده','Regeneration failed':'فشل إعادة التوليد',
    'Remove Quest':'حذف المهمة','Copied!':'تم النسخ!',
    // Settings
    'General':'عام','Enable ScenePulse':'تفعيل ScenePulse','Auto-generate on AI messages':'توليد تلقائي عند رسائل الذكاء الاصطناعي',
    'Show thought bubbles':'إظهار فقاعات الأفكار','Weather overlay effects':'تأثيرات الطقس','Time-of-day ambience':'أجواء الوقت',
    'Font scale':'حجم الخط','Language':'اللغة','Auto-detect':'كشف تلقائي',
    'Show developer tools':'أدوات المطور',
    // Field labels — scene
    'Topic':'الموضوع','Mood':'المزاج','Interaction':'التفاعل','Tension':'التوتر',
    'Summary':'ملخص','Sounds':'أصوات','Present':'حاضرون',
    // Field labels — character appearance
    'Hair':'الشعر','Face':'الوجه','Outfit':'الزي','Dress':'اللباس','Posture':'الوضعية',
    'Proximity':'القرب','Physical':'الحالة الجسدية','Inventory':'المقتنيات',
    // Field labels — goals
    'Need':'الحاجة','Short-Term':'قصير المدى','Long-Term':'طويل المدى',
    // Field labels — relationship meta
    'Time Known':'مدة المعرفة','Milestone':'معلم بارز',
    // Field labels — meters
    'Affection':'المودة','Trust':'الثقة','Desire':'الرغبة','Stress':'الضغط','Compat':'التوافق',
    // Field labels — fertility
    'Status':'الحالة','Reason':'السبب','Cycle Phase':'مرحلة الدورة','Cycle Day':'يوم الدورة',
    'Window':'النافذة','Pregnancy':'الحمل','Preg. Week':'أسبوع الحمل','Notes':'ملاحظات',
    'Fertility: N/A':'الخصوبة: غير متاح',
    // Stats footer
    'Together':'معًا','Separate':'منفصل','Inspect':'فحص',
    'Auto':'تلقائي','Backup':'نسخ احتياطي','Fallback':'بديل','Full regen':'توليد كامل','Settings':'الإعدادات',
    'Msg regen':'إعادة توليد الرسالة','Thoughts':'أفكار',
    'Message index':'فهرس الرسالة','Estimated tokens':'الرموز المقدّرة','Generation time':'وقت التوليد',
    // Panel Manager
    'Enable All':'تفعيل الكل','Disable All':'تعطيل الكل','Custom Panels':'لوحات مخصصة',
    '+ Add Custom Panel':'+ إضافة لوحة مخصصة',
    'Expand/Collapse sections':'توسيع/طي الأقسام','Condense view':'عرض مختصر',
    // Edit mode
    'Click any highlighted field to edit':'انقر على أي حقل مميّز للتحرير',
    'Edit Mode On':'وضع التحرير مفعّل','Edit Mode Off':'وضع التحرير معطّل',
    // Mobile
    'Scene updated':'تم تحديث المشهد','Open ScenePulse':'فتح ScenePulse',
    // Loading
    'Updating scene data':'جارٍ تحديث بيانات المشهد','Reading context and analyzing characters':'قراءة السياق وتحليل الشخصيات',
    // Settings sections/labels
    'Setup Guide':'دليل الإعداد','Guided Tour':'جولة إرشادية','Context msgs':'رسائل السياق',
    'Max retries':'أقصى محاولات','Delta mode':'وضع الدلتا','Injection Method':'طريقة الحقن',
    'Mode':'الوضع','Fallback Recovery':'استرداد بديل',
    'Enable automatic fallback':'تفعيل البديل التلقائي','Fallback Profile':'ملف البديل',
    'Fallback Preset':'إعداد البديل','Refresh Profiles':'تحديث الملفات',
    'Connection Profile':'ملف الاتصال','Chat Completion Preset':'إعداد إكمال الدردشة',
    'Prompt Mode':'وضع الأوامر','Context Embedding':'تضمين السياق',
    'Embed snapshots':'تضمين اللقطات','Embed as role':'تضمين كدور',
    'System':'النظام','User':'المستخدم','Assistant':'المساعد',
    'Lorebooks':'كتب المعرفة','Filter Mode':'وضع التصفية','Refresh Lorebooks':'تحديث كتب المعرفة',
    'System Prompt':'أوامر النظام','JSON Schema':'مخطط JSON','Reset to Default':'إعادة للافتراضي',
    'Actions':'الإجراءات','Generate':'توليد','Clear Data':'مسح البيانات','Reset Settings':'إعادة تعيين الإعدادات',
    'Debug':'تصحيح الأخطاء','SP Log':'سجل SP','View Log':'عرض السجل','Console':'وحدة التحكم',
    'Last Response':'آخر استجابة','Active':'نشط','Off':'مُعطّل',
    // Toast messages
    'Profiles refreshed':'تم تحديث الملفات','Fallback profiles refreshed':'تم تحديث ملفات البديل',
    'Lorebooks refreshed':'تم تحديث كتب المعرفة','System prompt reset to default':'تم إعادة تعيين أوامر النظام',
    'Prompt copied':'تم نسخ الأوامر','Schema reset to default':'تم إعادة تعيين المخطط',
    'Schema copied':'تم نسخ المخطط','Done':'تم','Failed':'فشل',
    'Data cleared':'تم مسح البيانات','Cleared':'تم المسح','Settings reset to defaults':'تم إعادة تعيين الإعدادات',
    'SP Log copied':'تم نسخ سجل SP','Console copied':'تم نسخ وحدة التحكم',
    'Copy failed':'فشل النسخ','No API response captured yet':'لم يتم التقاط استجابة API بعد',
    'Last response copied':'تم نسخ آخر استجابة','Debug log copied':'تم نسخ سجل التصحيح',
    'Invalid JSON':'JSON غير صالح',
    // Story ideas
    'Story direction sent':'تم إرسال اتجاه القصة','Story idea copied':'تم نسخ فكرة القصة',
    // Custom panels
    'Panel name':'اسم اللوحة','Key':'المفتاح','Label':'التسمية','Type':'النوع','LLM Hint':'تلميح LLM',
    'Add Field':'إضافة حقل','Delete panel':'حذف اللوحة','Remove this field':'حذف هذا الحقل',
    'Drag to reorder':'اسحب لإعادة الترتيب','No custom panels yet':'لا توجد لوحات مخصصة بعد',
    // Quest dialog
    'Quest name':'اسم المهمة','1-2 sentences from your perspective':'1-2 جملة من وجهة نظرك',
},
'Turkish': {
    // Section headers
    'Scene Details':'Sahne Detayları','Quest Journal':'Görev Günlüğü','Relationships':'İlişkiler',
    'Characters':'Karakterler','Story Ideas':'Hikâye Fikirleri','Inner Thoughts':'İç Düşünceler',
    'North Star':'Kutup Yıldızı','Main Quests':'Ana Görevler','Side Quests':'Yan Görevler',
    'Active Tasks':'Aktif Görevler',
    // Badges
    'new':'yeni','updated':'güncellendi','resolved':'tamamlandı',
    // Buttons & actions
    'Add quest':'Görev ekle','Cancel':'İptal','Add Quest':'Ekle','Regenerate all':'Tümünü yenile',
    'Mark as completed':'Tamamlandı işaretle','Remove quest':'Görevi sil','Restore quest':'Görevi geri yükle',
    'Stop Generation':'■ Durdur','Jump to latest':'En sona git','Copy':'Kopyala',
    // Empty states
    'No scene data yet':'Henüz sahne verisi yok','Send a message or click ⟳ to generate.':'Mesaj gönderin veya ⟳ tıklayın.',
    'No active storyline quests':'Aktif hikâye görevi yok','No side quests discovered':'Yan görev bulunamadı',
    'No immediate tasks':'Acil görev yok','Not yet revealed':'Henüz ortaya çıkmadı',
    // Form labels
    'Name':'Ad','Urgency':'Aciliyet','Details':'Ayrıntılar','Critical':'Kritik','High':'Yüksek','Moderate':'Orta','Low':'Düşük',
    // Tooltips
    'Toggle edit mode':'Düzenleme modunu aç/kapat','Show empty fields':'Boş alanları göster',
    'Snap to left of chat':'Sohbetin soluna sabitle','Ghost mode':'Hayalet modu','Regenerate thoughts':'Düşünceleri yenile',
    'Hide thoughts':'Düşünceleri gizle','Hide panel':'Paneli gizle','Panel Manager':'Panel Yöneticisi',
    // Loading
    'Generating Scene':'Sahne oluşturuluyor','Updating thoughts':'Düşünceler güncelleniyor','Analyzing context':'Bağlam analiz ediliyor',
    // Diff viewer
    'Payload Inspector':'Veri Denetleyicisi','Changes Only':'Yalnızca değişiklikler','Full Diff':'Tam karşılaştırma',
    'Side by Side':'Yan yana','Delta Payload':'Delta','Previous':'Önceki','Current':'Güncel','Full Payload':'Tam veri',
    // Toasts
    'Completed':'Tamamlandı','Removed':'Silindi','Added':'Eklendi','Regenerated':'Yenilendi','Regeneration failed':'Yenileme başarısız',
    'Remove Quest':'Görevi sil','Copied!':'Kopyalandı!',
    // Settings
    'General':'Genel','Enable ScenePulse':'ScenePulse\'u etkinleştir','Auto-generate on AI messages':'AI mesajlarında otomatik oluştur',
    'Show thought bubbles':'Düşünce balonlarını göster','Weather overlay effects':'Hava durumu efektleri','Time-of-day ambience':'Gün vakti ortamı',
    'Font scale':'Yazı tipi ölçeği','Language':'Dil','Auto-detect':'Otomatik algıla',
    'Show developer tools':'Geliştirici araçları',
    // Field labels — scene
    'Topic':'Konu','Mood':'Ruh hali','Interaction':'Etkileşim','Tension':'Gerilim',
    'Summary':'Özet','Sounds':'Sesler','Present':'Mevcut',
    // Field labels — character appearance
    'Hair':'Saç','Face':'Yüz','Outfit':'Kıyafet','Dress':'Giysi','Posture':'Duruş',
    'Proximity':'Yakınlık','Physical':'Fiziksel','Inventory':'Envanter',
    // Field labels — goals
    'Need':'İhtiyaç','Short-Term':'Kısa vadeli','Long-Term':'Uzun vadeli',
    // Field labels — relationship meta
    'Time Known':'Tanışma süresi','Milestone':'Dönüm noktası',
    // Field labels — meters
    'Affection':'Şefkat','Trust':'Güven','Desire':'Arzu','Stress':'Stres','Compat':'Uyum',
    // Field labels — fertility
    'Status':'Durum','Reason':'Neden','Cycle Phase':'Döngü fazı','Cycle Day':'Döngü günü',
    'Window':'Pencere','Pregnancy':'Gebelik','Preg. Week':'Geb. haftası','Notes':'Notlar',
    'Fertility: N/A':'Doğurganlık: Yok',
    // Stats footer
    'Together':'Birlikte','Separate':'Ayrı','Inspect':'Denetle',
    'Auto':'Otomatik','Backup':'Yedek','Fallback':'Yedek plan','Full regen':'Tam yenileme','Settings':'Ayarlar',
    'Msg regen':'Mesaj yenileme','Thoughts':'Düşünceler',
    'Message index':'Mesaj dizini','Estimated tokens':'Tahmini jeton','Generation time':'Oluşturma süresi',
    // Panel Manager
    'Enable All':'Tümünü etkinleştir','Disable All':'Tümünü devre dışı bırak','Custom Panels':'Özel Paneller',
    '+ Add Custom Panel':'+ Özel Panel Ekle',
    'Expand/Collapse sections':'Bölümleri aç/kapat','Condense view':'Sıkıştırılmış görünüm',
    // Edit mode
    'Click any highlighted field to edit':'Düzenlemek için vurgulanan alana tıklayın',
    'Edit Mode On':'Düzenleme modu açık','Edit Mode Off':'Düzenleme modu kapalı',
    // Mobile
    'Scene updated':'Sahne güncellendi','Open ScenePulse':'ScenePulse\'u aç',
    // Loading
    'Updating scene data':'Sahne verileri güncelleniyor','Reading context and analyzing characters':'Bağlam okunuyor ve karakterler analiz ediliyor',
    // Settings sections/labels
    'Setup Guide':'Kurulum Rehberi','Guided Tour':'Rehberli Tur','Context msgs':'Bağlam mesajları',
    'Max retries':'Maks. deneme','Delta mode':'Delta modu','Injection Method':'Enjeksiyon yöntemi',
    'Mode':'Mod','Fallback Recovery':'Yedek kurtarma',
    'Enable automatic fallback':'Otomatik yedek planı etkinleştir','Fallback Profile':'Yedek profil',
    'Fallback Preset':'Yedek ön ayar','Refresh Profiles':'Profilleri yenile',
    'Connection Profile':'Bağlantı profili','Chat Completion Preset':'Sohbet tamamlama ön ayarı',
    'Prompt Mode':'İstem modu','Context Embedding':'Bağlam gömme',
    'Embed snapshots':'Anlık görüntüleri göm','Embed as role':'Rol olarak göm',
    'System':'Sistem','User':'Kullanıcı','Assistant':'Asistan',
    'Lorebooks':'Bilgi kitapları','Filter Mode':'Filtre modu','Refresh Lorebooks':'Bilgi kitaplarını yenile',
    'System Prompt':'Sistem istemi','JSON Schema':'JSON Şeması','Reset to Default':'Varsayılana sıfırla',
    'Actions':'Eylemler','Generate':'Oluştur','Clear Data':'Verileri temizle','Reset Settings':'Ayarları sıfırla',
    'Debug':'Hata ayıklama','SP Log':'SP Günlüğü','View Log':'Günlüğü görüntüle','Console':'Konsol',
    'Last Response':'Son yanıt','Active':'Etkin','Off':'Kapalı',
    // Toast messages
    'Profiles refreshed':'Profiller yenilendi','Fallback profiles refreshed':'Yedek profiller yenilendi',
    'Lorebooks refreshed':'Bilgi kitapları yenilendi','System prompt reset to default':'Sistem istemi sıfırlandı',
    'Prompt copied':'İstem kopyalandı','Schema reset to default':'Şema sıfırlandı',
    'Schema copied':'Şema kopyalandı','Done':'Tamam','Failed':'Başarısız',
    'Data cleared':'Veriler temizlendi','Cleared':'Temizlendi','Settings reset to defaults':'Ayarlar sıfırlandı',
    'SP Log copied':'SP Günlüğü kopyalandı','Console copied':'Konsol kopyalandı',
    'Copy failed':'Kopyalama başarısız','No API response captured yet':'Henüz API yanıtı yakalanmadı',
    'Last response copied':'Son yanıt kopyalandı','Debug log copied':'Hata ayıklama günlüğü kopyalandı',
    'Invalid JSON':'Geçersiz JSON',
    // Story ideas
    'Story direction sent':'Hikâye yönü gönderildi','Story idea copied':'Hikâye fikri kopyalandı',
    // Custom panels
    'Panel name':'Panel adı','Key':'Anahtar','Label':'Etiket','Type':'Tür','LLM Hint':'LLM İpucu',
    'Add Field':'Alan ekle','Delete panel':'Paneli sil','Remove this field':'Bu alanı sil',
    'Drag to reorder':'Sıralamak için sürükle','No custom panels yet':'Henüz özel panel yok',
    // Quest dialog
    'Quest name':'Görev adı','1-2 sentences from your perspective':'Kendi bakış açınızdan 1-2 cümle',
},
'Vietnamese': {
    // Section headers
    'Scene Details':'Chi tiết cảnh','Quest Journal':'Nhật ký nhiệm vụ','Relationships':'Quan hệ',
    'Characters':'Nhân vật','Story Ideas':'Ý tưởng truyện','Inner Thoughts':'Suy nghĩ nội tâm',
    'North Star':'Ngôi sao dẫn đường','Main Quests':'Nhiệm vụ chính','Side Quests':'Nhiệm vụ phụ',
    'Active Tasks':'Nhiệm vụ đang hoạt động',
    // Badges
    'new':'mới','updated':'đã cập nhật','resolved':'hoàn thành',
    // Buttons & actions
    'Add quest':'Thêm nhiệm vụ','Cancel':'Hủy','Add Quest':'Thêm','Regenerate all':'Tạo lại tất cả',
    'Mark as completed':'Đánh dấu hoàn thành','Remove quest':'Xóa nhiệm vụ','Restore quest':'Khôi phục nhiệm vụ',
    'Stop Generation':'■ Dừng','Jump to latest':'Đến mới nhất','Copy':'Sao chép',
    // Empty states
    'No scene data yet':'Chưa có dữ liệu cảnh','Send a message or click ⟳ to generate.':'Gửi tin nhắn hoặc nhấn ⟳ để tạo.',
    'No active storyline quests':'Không có nhiệm vụ cốt truyện','No side quests discovered':'Không tìm thấy nhiệm vụ phụ',
    'No immediate tasks':'Không có nhiệm vụ cấp bách','Not yet revealed':'Chưa được tiết lộ',
    // Form labels
    'Name':'Tên','Urgency':'Cấp bách','Details':'Chi tiết','Critical':'Nghiêm trọng','High':'Cao','Moderate':'Trung bình','Low':'Thấp',
    // Tooltips
    'Toggle edit mode':'Chuyển chế độ sửa','Show empty fields':'Hiện trường trống',
    'Snap to left of chat':'Ghim bên trái chat','Ghost mode':'Chế độ bóng ma','Regenerate thoughts':'Tạo lại suy nghĩ',
    'Hide thoughts':'Ẩn suy nghĩ','Hide panel':'Ẩn bảng','Panel Manager':'Quản lý bảng',
    // Loading
    'Generating Scene':'Đang tạo cảnh','Updating thoughts':'Đang cập nhật suy nghĩ','Analyzing context':'Đang phân tích ngữ cảnh',
    // Diff viewer
    'Payload Inspector':'Trình kiểm tra dữ liệu','Changes Only':'Chỉ thay đổi','Full Diff':'So sánh đầy đủ',
    'Side by Side':'Song song','Delta Payload':'Delta','Previous':'Trước','Current':'Hiện tại','Full Payload':'Dữ liệu đầy đủ',
    // Toasts
    'Completed':'Hoàn thành','Removed':'Đã xóa','Added':'Đã thêm','Regenerated':'Đã tạo lại','Regeneration failed':'Tạo lại thất bại',
    'Remove Quest':'Xóa nhiệm vụ','Copied!':'Đã sao chép!',
    // Settings
    'General':'Chung','Enable ScenePulse':'Bật ScenePulse','Auto-generate on AI messages':'Tự động tạo khi AI trả lời',
    'Show thought bubbles':'Hiện bong bóng suy nghĩ','Weather overlay effects':'Hiệu ứng thời tiết','Time-of-day ambience':'Ánh sáng theo giờ',
    'Font scale':'Cỡ chữ','Language':'Ngôn ngữ','Auto-detect':'Tự động nhận diện',
    'Show developer tools':'Công cụ nhà phát triển',
    // Field labels — scene
    'Topic':'Chủ đề','Mood':'Tâm trạng','Interaction':'Tương tác','Tension':'Căng thẳng',
    'Summary':'Tóm tắt','Sounds':'Âm thanh','Present':'Có mặt',
    // Field labels — character appearance
    'Hair':'Tóc','Face':'Gương mặt','Outfit':'Trang phục','Dress':'Y phục','Posture':'Tư thế',
    'Proximity':'Khoảng cách','Physical':'Thể chất','Inventory':'Vật phẩm',
    // Field labels — goals
    'Need':'Nhu cầu','Short-Term':'Ngắn hạn','Long-Term':'Dài hạn',
    // Field labels — relationship meta
    'Time Known':'Thời gian quen','Milestone':'Cột mốc',
    // Field labels — meters
    'Affection':'Tình cảm','Trust':'Niềm tin','Desire':'Ham muốn','Stress':'Căng thẳng','Compat':'Tương hợp',
    // Field labels — fertility
    'Status':'Trạng thái','Reason':'Lý do','Cycle Phase':'Giai đoạn chu kỳ','Cycle Day':'Ngày chu kỳ',
    'Window':'Cửa sổ','Pregnancy':'Thai kỳ','Preg. Week':'Tuần thai','Notes':'Ghi chú',
    'Fertility: N/A':'Sinh sản: Không áp dụng',
    // Stats footer
    'Together':'Gộp','Separate':'Tách','Inspect':'Kiểm tra',
    'Auto':'Tự động','Backup':'Sao lưu','Fallback':'Dự phòng','Full regen':'Tạo lại hoàn toàn','Settings':'Cài đặt',
    'Msg regen':'Tạo lại tin nhắn','Thoughts':'Suy nghĩ',
    'Message index':'Chỉ số tin nhắn','Estimated tokens':'Token ước tính','Generation time':'Thời gian tạo',
    // Panel Manager
    'Enable All':'Bật tất cả','Disable All':'Tắt tất cả','Custom Panels':'Bảng tùy chỉnh',
    '+ Add Custom Panel':'+ Thêm bảng tùy chỉnh',
    'Expand/Collapse sections':'Mở rộng/Thu gọn mục','Condense view':'Chế độ gọn',
    // Edit mode
    'Click any highlighted field to edit':'Nhấn vào trường được tô sáng để chỉnh sửa',
    'Edit Mode On':'Chế độ sửa bật','Edit Mode Off':'Chế độ sửa tắt',
    // Mobile
    'Scene updated':'Cảnh đã cập nhật','Open ScenePulse':'Mở ScenePulse',
    // Loading
    'Updating scene data':'Đang cập nhật dữ liệu cảnh','Reading context and analyzing characters':'Đang đọc ngữ cảnh và phân tích nhân vật',
    // Settings sections/labels
    'Setup Guide':'Hướng dẫn cài đặt','Guided Tour':'Tham quan hướng dẫn','Context msgs':'Tin nhắn ngữ cảnh',
    'Max retries':'Số lần thử tối đa','Delta mode':'Chế độ delta','Injection Method':'Phương thức tiêm',
    'Mode':'Chế độ','Fallback Recovery':'Phục hồi dự phòng',
    'Enable automatic fallback':'Bật dự phòng tự động','Fallback Profile':'Hồ sơ dự phòng',
    'Fallback Preset':'Cài đặt dự phòng','Refresh Profiles':'Làm mới hồ sơ',
    'Connection Profile':'Hồ sơ kết nối','Chat Completion Preset':'Cài đặt hoàn thành chat',
    'Prompt Mode':'Chế độ lệnh','Context Embedding':'Nhúng ngữ cảnh',
    'Embed snapshots':'Nhúng ảnh chụp','Embed as role':'Nhúng theo vai trò',
    'System':'Hệ thống','User':'Người dùng','Assistant':'Trợ lý',
    'Lorebooks':'Sách kiến thức','Filter Mode':'Chế độ lọc','Refresh Lorebooks':'Làm mới sách kiến thức',
    'System Prompt':'Lệnh hệ thống','JSON Schema':'Lược đồ JSON','Reset to Default':'Đặt lại mặc định',
    'Actions':'Thao tác','Generate':'Tạo','Clear Data':'Xóa dữ liệu','Reset Settings':'Đặt lại cài đặt',
    'Debug':'Gỡ lỗi','SP Log':'Nhật ký SP','View Log':'Xem nhật ký','Console':'Bảng điều khiển',
    'Last Response':'Phản hồi cuối','Active':'Hoạt động','Off':'Tắt',
    // Toast messages
    'Profiles refreshed':'Đã làm mới hồ sơ','Fallback profiles refreshed':'Đã làm mới hồ sơ dự phòng',
    'Lorebooks refreshed':'Đã làm mới sách kiến thức','System prompt reset to default':'Đã đặt lại lệnh hệ thống',
    'Prompt copied':'Đã sao chép lệnh','Schema reset to default':'Đã đặt lại lược đồ',
    'Schema copied':'Đã sao chép lược đồ','Done':'Xong','Failed':'Thất bại',
    'Data cleared':'Đã xóa dữ liệu','Cleared':'Đã xóa','Settings reset to defaults':'Đã đặt lại cài đặt',
    'SP Log copied':'Đã sao chép nhật ký SP','Console copied':'Đã sao chép bảng điều khiển',
    'Copy failed':'Sao chép thất bại','No API response captured yet':'Chưa có phản hồi API',
    'Last response copied':'Đã sao chép phản hồi cuối','Debug log copied':'Đã sao chép nhật ký gỡ lỗi',
    'Invalid JSON':'JSON không hợp lệ',
    // Story ideas
    'Story direction sent':'Đã gửi hướng truyện','Story idea copied':'Đã sao chép ý tưởng truyện',
    // Custom panels
    'Panel name':'Tên bảng','Key':'Khóa','Label':'Nhãn','Type':'Loại','LLM Hint':'Gợi ý LLM',
    'Add Field':'Thêm trường','Delete panel':'Xóa bảng','Remove this field':'Xóa trường này',
    'Drag to reorder':'Kéo để sắp xếp','No custom panels yet':'Chưa có bảng tùy chỉnh',
    // Quest dialog
    'Quest name':'Tên nhiệm vụ','1-2 sentences from your perspective':'1-2 câu từ góc nhìn của bạn',
},
'Italian': {
    // Section headers
    'Scene Details':'Dettagli scena','Quest Journal':'Diario missioni','Relationships':'Relazioni',
    'Characters':'Personaggi','Story Ideas':'Idee per la storia','Inner Thoughts':'Pensieri interiori',
    'North Star':'Stella polare','Main Quests':'Missioni principali','Side Quests':'Missioni secondarie',
    'Active Tasks':'Compiti attivi',
    // Badges
    'new':'nuovo','updated':'aggiorn.','resolved':'risolto',
    // Buttons & actions
    'Add quest':'Aggiungi missione','Cancel':'Annulla','Add Quest':'Aggiungi','Regenerate all':'Rigenera tutto',
    'Mark as completed':'Segna come completata','Remove quest':'Rimuovi missione','Restore quest':'Ripristina missione',
    'Stop Generation':'■ Ferma','Jump to latest':'Vai all\'ultimo','Copy':'Copia',
    // Empty states
    'No scene data yet':'Nessun dato scena','Send a message or click ⟳ to generate.':'Invia un messaggio o clicca ⟳ per generare.',
    'No active storyline quests':'Nessuna missione attiva','No side quests discovered':'Nessuna missione secondaria',
    'No immediate tasks':'Nessun compito immediato','Not yet revealed':'Non ancora rivelato',
    // Form labels
    'Name':'Nome','Urgency':'Urgenza','Details':'Dettagli','Critical':'Critica','High':'Alta','Moderate':'Media','Low':'Bassa',
    // Tooltips
    'Toggle edit mode':'Attiva/disattiva modifica','Show empty fields':'Mostra campi vuoti',
    'Snap to left of chat':'Aggancia a sinistra','Ghost mode':'Modalità fantasma','Regenerate thoughts':'Rigenera pensieri',
    'Hide thoughts':'Nascondi pensieri','Hide panel':'Nascondi pannello','Panel Manager':'Gestione pannelli',
    // Loading
    'Generating Scene':'Generazione scena','Updating thoughts':'Aggiornamento pensieri','Analyzing context':'Analisi del contesto',
    // Diff viewer
    'Payload Inspector':'Ispettore dati','Changes Only':'Solo modifiche','Full Diff':'Confronto completo',
    'Side by Side':'Affiancato','Delta Payload':'Delta','Previous':'Precedente','Current':'Attuale','Full Payload':'Dati completi',
    // Toasts
    'Completed':'Completata','Removed':'Rimossa','Added':'Aggiunta','Regenerated':'Rigenerato','Regeneration failed':'Rigenerazione fallita',
    'Remove Quest':'Rimuovi missione','Copied!':'Copiato!',
    // Settings
    'General':'Generale','Enable ScenePulse':'Attiva ScenePulse','Auto-generate on AI messages':'Auto-genera su messaggi IA',
    'Show thought bubbles':'Mostra bolle di pensiero','Weather overlay effects':'Effetti meteo','Time-of-day ambience':'Atmosfera dell\'ora',
    'Font scale':'Scala carattere','Language':'Lingua','Auto-detect':'Rilevamento auto',
    'Show developer tools':'Strumenti sviluppatore',
    // Field labels — scene
    'Topic':'Argomento','Mood':'Umore','Interaction':'Interazione','Tension':'Tensione',
    'Summary':'Riepilogo','Sounds':'Suoni','Present':'Presenti',
    // Field labels — character appearance
    'Hair':'Capelli','Face':'Viso','Outfit':'Abbigliamento','Dress':'Abito','Posture':'Postura',
    'Proximity':'Prossimità','Physical':'Fisico','Inventory':'Inventario',
    // Field labels — goals
    'Need':'Bisogno','Short-Term':'Breve termine','Long-Term':'Lungo termine',
    // Field labels — relationship meta
    'Time Known':'Tempo conosciuto','Milestone':'Traguardo',
    // Field labels — meters
    'Affection':'Affetto','Trust':'Fiducia','Desire':'Desiderio','Stress':'Stress','Compat':'Compat.',
    // Field labels — fertility
    'Status':'Stato','Reason':'Motivo','Cycle Phase':'Fase del ciclo','Cycle Day':'Giorno del ciclo',
    'Window':'Finestra','Pregnancy':'Gravidanza','Preg. Week':'Sett. gravidanza','Notes':'Note',
    'Fertility: N/A':'Fertilità: N/D',
    // Stats footer
    'Together':'Insieme','Separate':'Separato','Inspect':'Ispeziona',
    'Auto':'Auto','Backup':'Backup','Fallback':'Riserva','Full regen':'Rigen. completa','Settings':'Impostazioni',
    'Msg regen':'Rigen. messaggio','Thoughts':'Pensieri',
    'Message index':'Indice messaggio','Estimated tokens':'Token stimati','Generation time':'Tempo di generazione',
    // Panel Manager
    'Enable All':'Attiva tutti','Disable All':'Disattiva tutti','Custom Panels':'Pannelli personalizzati',
    '+ Add Custom Panel':'+ Aggiungi pannello',
    'Expand/Collapse sections':'Espandi/Comprimi sezioni','Condense view':'Vista compatta',
    // Edit mode
    'Click any highlighted field to edit':'Clicca su un campo evidenziato per modificare',
    'Edit Mode On':'Modalità modifica attiva','Edit Mode Off':'Modalità modifica disattiva',
    // Mobile
    'Scene updated':'Scena aggiornata','Open ScenePulse':'Apri ScenePulse',
    // Loading
    'Updating scene data':'Aggiornamento dati scena','Reading context and analyzing characters':'Lettura contesto e analisi personaggi',
    // Settings sections/labels
    'Setup Guide':'Guida configurazione','Guided Tour':'Tour guidato','Context msgs':'Messaggi contesto',
    'Max retries':'Max tentativi','Delta mode':'Modalità delta','Injection Method':'Metodo di iniezione',
    'Mode':'Modalità','Fallback Recovery':'Recupero di riserva',
    'Enable automatic fallback':'Attiva riserva automatica','Fallback Profile':'Profilo riserva',
    'Fallback Preset':'Preset riserva','Refresh Profiles':'Aggiorna profili',
    'Connection Profile':'Profilo connessione','Chat Completion Preset':'Preset completamento chat',
    'Prompt Mode':'Modalità prompt','Context Embedding':'Incorporamento contesto',
    'Embed snapshots':'Incorpora snapshot','Embed as role':'Incorpora come ruolo',
    'System':'Sistema','User':'Utente','Assistant':'Assistente',
    'Lorebooks':'Lorebooks','Filter Mode':'Modalità filtro','Refresh Lorebooks':'Aggiorna lorebooks',
    'System Prompt':'Prompt di sistema','JSON Schema':'Schema JSON','Reset to Default':'Ripristina predefinito',
    'Actions':'Azioni','Generate':'Genera','Clear Data':'Cancella dati','Reset Settings':'Ripristina impostazioni',
    'Debug':'Debug','SP Log':'Log SP','View Log':'Visualizza log','Console':'Console',
    'Last Response':'Ultima risposta','Active':'Attivo','Off':'Spento',
    // Toast messages
    'Profiles refreshed':'Profili aggiornati','Fallback profiles refreshed':'Profili riserva aggiornati',
    'Lorebooks refreshed':'Lorebooks aggiornati','System prompt reset to default':'Prompt di sistema ripristinato',
    'Prompt copied':'Prompt copiato','Schema reset to default':'Schema ripristinato',
    'Schema copied':'Schema copiato','Done':'Fatto','Failed':'Fallito',
    'Data cleared':'Dati cancellati','Cleared':'Cancellato','Settings reset to defaults':'Impostazioni ripristinate',
    'SP Log copied':'Log SP copiato','Console copied':'Console copiata',
    'Copy failed':'Copia fallita','No API response captured yet':'Nessuna risposta API catturata',
    'Last response copied':'Ultima risposta copiata','Debug log copied':'Log debug copiato',
    'Invalid JSON':'JSON non valido',
    // Story ideas
    'Story direction sent':'Direzione storia inviata','Story idea copied':'Idea storia copiata',
    // Custom panels
    'Panel name':'Nome pannello','Key':'Chiave','Label':'Etichetta','Type':'Tipo','LLM Hint':'Suggerimento LLM',
    'Add Field':'Aggiungi campo','Delete panel':'Elimina pannello','Remove this field':'Rimuovi questo campo',
    'Drag to reorder':'Trascina per riordinare','No custom panels yet':'Nessun pannello personalizzato',
    // Quest dialog
    'Quest name':'Nome missione','1-2 sentences from your perspective':'1-2 frasi dal tuo punto di vista',
},
'Thai': {
    // Section headers
    'Scene Details':'รายละเอียดฉาก','Quest Journal':'บันทึกภารกิจ','Relationships':'ความสัมพันธ์',
    'Characters':'ตัวละคร','Story Ideas':'ไอเดียเรื่องราว','Inner Thoughts':'ความคิดภายใน',
    'North Star':'ดาวเหนือ','Main Quests':'ภารกิจหลัก','Side Quests':'ภารกิจรอง',
    'Active Tasks':'งานที่ใช้งานอยู่',
    // Badges
    'new':'ใหม่','updated':'อัปเดต','resolved':'เสร็จสิ้น',
    // Buttons & actions
    'Add quest':'เพิ่มภารกิจ','Cancel':'ยกเลิก','Add Quest':'เพิ่ม','Regenerate all':'สร้างใหม่ทั้งหมด',
    'Mark as completed':'ทำเครื่องหมายเสร็จ','Remove quest':'ลบภารกิจ','Restore quest':'กู้คืนภารกิจ',
    'Stop Generation':'■ หยุด','Jump to latest':'ไปล่าสุด','Copy':'คัดลอก',
    // Empty states
    'No scene data yet':'ยังไม่มีข้อมูลฉาก','Send a message or click ⟳ to generate.':'ส่งข้อความหรือกด ⟳ เพื่อสร้าง',
    'No active storyline quests':'ไม่มีภารกิจเนื้อเรื่อง','No side quests discovered':'ไม่พบภารกิจรอง',
    'No immediate tasks':'ไม่มีงานเร่งด่วน','Not yet revealed':'ยังไม่เปิดเผย',
    // Form labels
    'Name':'ชื่อ','Urgency':'ความเร่งด่วน','Details':'รายละเอียด','Critical':'วิกฤต','High':'สูง','Moderate':'ปานกลาง','Low':'ต่ำ',
    // Tooltips
    'Toggle edit mode':'สลับโหมดแก้ไข','Show empty fields':'แสดงช่องว่าง',
    'Snap to left of chat':'ยึดด้านซ้ายแชท','Ghost mode':'โหมดผี','Regenerate thoughts':'สร้างความคิดใหม่',
    'Hide thoughts':'ซ่อนความคิด','Hide panel':'ซ่อนแผง','Panel Manager':'ตัวจัดการแผง',
    // Loading
    'Generating Scene':'กำลังสร้างฉาก','Updating thoughts':'กำลังอัปเดตความคิด','Analyzing context':'กำลังวิเคราะห์บริบท',
    // Diff viewer
    'Payload Inspector':'ตัวตรวจสอบข้อมูล','Changes Only':'เฉพาะการเปลี่ยนแปลง','Full Diff':'เปรียบเทียบเต็ม',
    'Side by Side':'เทียบข้างกัน','Delta Payload':'เดลตา','Previous':'ก่อนหน้า','Current':'ปัจจุบัน','Full Payload':'ข้อมูลเต็ม',
    // Toasts
    'Completed':'เสร็จสิ้น','Removed':'ลบแล้ว','Added':'เพิ่มแล้ว','Regenerated':'สร้างใหม่แล้ว','Regeneration failed':'การสร้างใหม่ล้มเหลว',
    'Remove Quest':'ลบภารกิจ','Copied!':'คัดลอกแล้ว!',
    // Settings
    'General':'ทั่วไป','Enable ScenePulse':'เปิด ScenePulse','Auto-generate on AI messages':'สร้างอัตโนมัติเมื่อ AI ตอบ',
    'Show thought bubbles':'แสดงฟองความคิด','Weather overlay effects':'เอฟเฟกต์สภาพอากาศ','Time-of-day ambience':'บรรยากาศตามเวลา',
    'Font scale':'ขนาดตัวอักษร','Language':'ภาษา','Auto-detect':'ตรวจจับอัตโนมัติ',
    'Show developer tools':'เครื่องมือนักพัฒนา',
    // Field labels — scene
    'Topic':'หัวข้อ','Mood':'อารมณ์','Interaction':'ปฏิสัมพันธ์','Tension':'ความตึงเครียด',
    'Summary':'สรุป','Sounds':'เสียง','Present':'อยู่ในฉาก',
    // Field labels — character appearance
    'Hair':'ผม','Face':'ใบหน้า','Outfit':'ชุด','Dress':'เครื่องแต่งกาย','Posture':'ท่าทาง',
    'Proximity':'ความใกล้ชิด','Physical':'กายภาพ','Inventory':'สิ่งของ',
    // Field labels — goals
    'Need':'ความต้องการ','Short-Term':'ระยะสั้น','Long-Term':'ระยะยาว',
    // Field labels — relationship meta
    'Time Known':'ระยะเวลารู้จัก','Milestone':'เหตุการณ์สำคัญ',
    // Field labels — meters
    'Affection':'ความรัก','Trust':'ความไว้วางใจ','Desire':'ความปรารถนา','Stress':'ความเครียด','Compat':'ความเข้ากัน',
    // Field labels — fertility
    'Status':'สถานะ','Reason':'เหตุผล','Cycle Phase':'ระยะรอบเดือน','Cycle Day':'วันรอบเดือน',
    'Window':'ช่วงเวลา','Pregnancy':'การตั้งครรภ์','Preg. Week':'สัปดาห์ครรภ์','Notes':'บันทึก',
    'Fertility: N/A':'ภาวะเจริญพันธุ์: ไม่ระบุ',
    // Stats footer
    'Together':'รวม','Separate':'แยก','Inspect':'ตรวจสอบ',
    'Auto':'อัตโนมัติ','Backup':'สำรอง','Fallback':'ทางเลือก','Full regen':'สร้างใหม่ทั้งหมด','Settings':'การตั้งค่า',
    'Msg regen':'สร้างข้อความใหม่','Thoughts':'ความคิด',
    'Message index':'ดัชนีข้อความ','Estimated tokens':'โทเค็นโดยประมาณ','Generation time':'เวลาสร้าง',
    // Panel Manager
    'Enable All':'เปิดทั้งหมด','Disable All':'ปิดทั้งหมด','Custom Panels':'แผงกำหนดเอง',
    '+ Add Custom Panel':'+ เพิ่มแผงกำหนดเอง',
    'Expand/Collapse sections':'ขยาย/ยุบส่วน','Condense view':'มุมมองกระชับ',
    // Edit mode
    'Click any highlighted field to edit':'คลิกช่องที่ไฮไลต์เพื่อแก้ไข',
    'Edit Mode On':'โหมดแก้ไขเปิด','Edit Mode Off':'โหมดแก้ไขปิด',
    // Mobile
    'Scene updated':'ฉากอัปเดตแล้ว','Open ScenePulse':'เปิด ScenePulse',
    // Loading
    'Updating scene data':'กำลังอัปเดตข้อมูลฉาก','Reading context and analyzing characters':'กำลังอ่านบริบทและวิเคราะห์ตัวละคร',
    // Settings sections/labels
    'Setup Guide':'คู่มือตั้งค่า','Guided Tour':'ทัวร์แนะนำ','Context msgs':'ข้อความบริบท',
    'Max retries':'จำนวนลองสูงสุด','Delta mode':'โหมดเดลตา','Injection Method':'วิธีการฉีด',
    'Mode':'โหมด','Fallback Recovery':'การกู้คืนทางเลือก',
    'Enable automatic fallback':'เปิดทางเลือกอัตโนมัติ','Fallback Profile':'โปรไฟล์ทางเลือก',
    'Fallback Preset':'พรีเซ็ตทางเลือก','Refresh Profiles':'รีเฟรชโปรไฟล์',
    'Connection Profile':'โปรไฟล์การเชื่อมต่อ','Chat Completion Preset':'พรีเซ็ตแชท',
    'Prompt Mode':'โหมดพรอมต์','Context Embedding':'การฝังบริบท',
    'Embed snapshots':'ฝังสแนปช็อต','Embed as role':'ฝังเป็นบทบาท',
    'System':'ระบบ','User':'ผู้ใช้','Assistant':'ผู้ช่วย',
    'Lorebooks':'หนังสือความรู้','Filter Mode':'โหมดกรอง','Refresh Lorebooks':'รีเฟรชหนังสือความรู้',
    'System Prompt':'พรอมต์ระบบ','JSON Schema':'JSON สคีมา','Reset to Default':'รีเซ็ตเป็นค่าเริ่มต้น',
    'Actions':'การดำเนินการ','Generate':'สร้าง','Clear Data':'ล้างข้อมูล','Reset Settings':'รีเซ็ตการตั้งค่า',
    'Debug':'ดีบัก','SP Log':'บันทึก SP','View Log':'ดูบันทึก','Console':'คอนโซล',
    'Last Response':'การตอบกลับล่าสุด','Active':'ใช้งาน','Off':'ปิด',
    // Toast messages
    'Profiles refreshed':'รีเฟรชโปรไฟล์แล้ว','Fallback profiles refreshed':'รีเฟรชโปรไฟล์ทางเลือกแล้ว',
    'Lorebooks refreshed':'รีเฟรชหนังสือความรู้แล้ว','System prompt reset to default':'รีเซ็ตพรอมต์ระบบแล้ว',
    'Prompt copied':'คัดลอกพรอมต์แล้ว','Schema reset to default':'รีเซ็ตสคีมาแล้ว',
    'Schema copied':'คัดลอกสคีมาแล้ว','Done':'เสร็จ','Failed':'ล้มเหลว',
    'Data cleared':'ล้างข้อมูลแล้ว','Cleared':'ล้างแล้ว','Settings reset to defaults':'รีเซ็ตการตั้งค่าแล้ว',
    'SP Log copied':'คัดลอกบันทึก SP แล้ว','Console copied':'คัดลอกคอนโซลแล้ว',
    'Copy failed':'คัดลอกล้มเหลว','No API response captured yet':'ยังไม่มีการตอบกลับ API',
    'Last response copied':'คัดลอกการตอบกลับล่าสุดแล้ว','Debug log copied':'คัดลอกบันทึกดีบักแล้ว',
    'Invalid JSON':'JSON ไม่ถูกต้อง',
    // Story ideas
    'Story direction sent':'ส่งทิศทางเรื่องแล้ว','Story idea copied':'คัดลอกไอเดียเรื่องแล้ว',
    // Custom panels
    'Panel name':'ชื่อแผง','Key':'คีย์','Label':'ป้ายกำกับ','Type':'ประเภท','LLM Hint':'คำแนะนำ LLM',
    'Add Field':'เพิ่มช่อง','Delete panel':'ลบแผง','Remove this field':'ลบช่องนี้',
    'Drag to reorder':'ลากเพื่อเรียงลำดับ','No custom panels yet':'ยังไม่มีแผงกำหนดเอง',
    // Quest dialog
    'Quest name':'ชื่อภารกิจ','1-2 sentences from your perspective':'1-2 ประโยคจากมุมมองของคุณ',
},
'Polish': {
    // Section headers
    'Scene Details':'Szczegóły sceny','Quest Journal':'Dziennik misji','Relationships':'Relacje',
    'Characters':'Postacie','Story Ideas':'Pomysły na fabułę','Inner Thoughts':'Wewnętrzne myśli',
    'North Star':'Gwiazda Polarna','Main Quests':'Misje główne','Side Quests':'Misje poboczne',
    'Active Tasks':'Aktywne zadania',
    // Badges
    'new':'nowy','updated':'zaktualizow.','resolved':'ukończony',
    // Buttons & actions
    'Add quest':'Dodaj misję','Cancel':'Anuluj','Add Quest':'Dodaj','Regenerate all':'Odśwież wszystko',
    'Mark as completed':'Oznacz jako ukończone','Remove quest':'Usuń misję','Restore quest':'Przywróć misję',
    'Stop Generation':'■ Zatrzymaj','Jump to latest':'Do najnowszego','Copy':'Kopiuj',
    // Empty states
    'No scene data yet':'Brak danych sceny','Send a message or click ⟳ to generate.':'Wyślij wiadomość lub kliknij ⟳.',
    'No active storyline quests':'Brak aktywnych misji fabularnych','No side quests discovered':'Brak misji pobocznych',
    'No immediate tasks':'Brak pilnych zadań','Not yet revealed':'Jeszcze nie ujawnione',
    // Form labels
    'Name':'Nazwa','Urgency':'Pilność','Details':'Szczegóły','Critical':'Krytyczna','High':'Wysoka','Moderate':'Średnia','Low':'Niska',
    // Tooltips
    'Toggle edit mode':'Przełącz tryb edycji','Show empty fields':'Pokaż puste pola',
    'Snap to left of chat':'Przypnij po lewej','Ghost mode':'Tryb widmo','Regenerate thoughts':'Odśwież myśli',
    'Hide thoughts':'Ukryj myśli','Hide panel':'Ukryj panel','Panel Manager':'Menedżer paneli',
    // Loading
    'Generating Scene':'Generowanie sceny','Updating thoughts':'Aktualizacja myśli','Analyzing context':'Analiza kontekstu',
    // Diff viewer
    'Payload Inspector':'Inspektor danych','Changes Only':'Tylko zmiany','Full Diff':'Pełne porównanie',
    'Side by Side':'Obok siebie','Delta Payload':'Delta','Previous':'Poprzedni','Current':'Bieżący','Full Payload':'Pełne dane',
    // Toasts
    'Completed':'Ukończono','Removed':'Usunięto','Added':'Dodano','Regenerated':'Odświeżono','Regeneration failed':'Odświeżanie nie powiodło się',
    'Remove Quest':'Usuń misję','Copied!':'Skopiowano!',
    // Settings
    'General':'Ogólne','Enable ScenePulse':'Włącz ScenePulse','Auto-generate on AI messages':'Automatyczne generowanie przy wiadomościach AI',
    'Show thought bubbles':'Pokaż dymki myśli','Weather overlay effects':'Efekty pogodowe','Time-of-day ambience':'Atmosfera pory dnia',
    'Font scale':'Skala czcionki','Language':'Język','Auto-detect':'Automatyczne wykrywanie',
    'Show developer tools':'Narzędzia programisty',
    // Field labels — scene
    'Topic':'Temat','Mood':'Nastrój','Interaction':'Interakcja','Tension':'Napięcie',
    'Summary':'Podsumowanie','Sounds':'Dźwięki','Present':'Obecni',
    // Field labels — character appearance
    'Hair':'Włosy','Face':'Twarz','Outfit':'Strój','Dress':'Ubiór','Posture':'Postawa',
    'Proximity':'Bliskość','Physical':'Stan fizyczny','Inventory':'Ekwipunek',
    // Field labels — goals
    'Need':'Potrzeba','Short-Term':'Krótkoterm.','Long-Term':'Długoterm.',
    // Field labels — relationship meta
    'Time Known':'Okres znajomości','Milestone':'Kamień milowy',
    // Field labels — meters
    'Affection':'Uczucie','Trust':'Zaufanie','Desire':'Pożądanie','Stress':'Stres','Compat':'Kompatybil.',
    // Field labels — fertility
    'Status':'Status','Reason':'Powód','Cycle Phase':'Faza cyklu','Cycle Day':'Dzień cyklu',
    'Window':'Okno','Pregnancy':'Ciąża','Preg. Week':'Tydz. ciąży','Notes':'Notatki',
    'Fertility: N/A':'Płodność: Nie dotyczy',
    // Stats footer
    'Together':'Razem','Separate':'Osobno','Inspect':'Inspekcja',
    'Auto':'Auto','Backup':'Kopia','Fallback':'Awaryjny','Full regen':'Pełna regen.','Settings':'Ustawienia',
    'Msg regen':'Regen. wiadomości','Thoughts':'Myśli',
    'Message index':'Indeks wiadomości','Estimated tokens':'Szacowane tokeny','Generation time':'Czas generowania',
    // Panel Manager
    'Enable All':'Włącz wszystkie','Disable All':'Wyłącz wszystkie','Custom Panels':'Własne panele',
    '+ Add Custom Panel':'+ Dodaj własny panel',
    'Expand/Collapse sections':'Rozwiń/Zwiń sekcje','Condense view':'Widok kompaktowy',
    // Edit mode
    'Click any highlighted field to edit':'Kliknij podświetlone pole, aby edytować',
    'Edit Mode On':'Tryb edycji włączony','Edit Mode Off':'Tryb edycji wyłączony',
    // Mobile
    'Scene updated':'Scena zaktualizowana','Open ScenePulse':'Otwórz ScenePulse',
    // Loading
    'Updating scene data':'Aktualizacja danych sceny','Reading context and analyzing characters':'Odczyt kontekstu i analiza postaci',
    // Settings sections/labels
    'Setup Guide':'Przewodnik','Guided Tour':'Wycieczka','Context msgs':'Wiadomości kontekstowe',
    'Max retries':'Maks. prób','Delta mode':'Tryb delta','Injection Method':'Metoda wstrzykiwania',
    'Mode':'Tryb','Fallback Recovery':'Odzyskiwanie awaryjne',
    'Enable automatic fallback':'Automatyczny tryb awaryjny','Fallback Profile':'Profil awaryjny',
    'Fallback Preset':'Preset awaryjny','Refresh Profiles':'Odśwież profile',
    'Connection Profile':'Profil połączenia','Chat Completion Preset':'Preset uzupełniania czatu',
    'Prompt Mode':'Tryb promptu','Context Embedding':'Osadzanie kontekstu',
    'Embed snapshots':'Osadź migawki','Embed as role':'Osadź jako rolę',
    'System':'System','User':'Użytkownik','Assistant':'Asystent',
    'Lorebooks':'Lorebooki','Filter Mode':'Tryb filtra','Refresh Lorebooks':'Odśwież lorebooki',
    'System Prompt':'Prompt systemowy','JSON Schema':'Schemat JSON','Reset to Default':'Przywróć domyślne',
    'Actions':'Akcje','Generate':'Generuj','Clear Data':'Wyczyść dane','Reset Settings':'Zresetuj ustawienia',
    'Debug':'Debugowanie','SP Log':'Dziennik SP','View Log':'Zobacz dziennik','Console':'Konsola',
    'Last Response':'Ostatnia odpowiedź','Active':'Aktywny','Off':'Wyłączony',
    // Toast messages
    'Profiles refreshed':'Profile odświeżone','Fallback profiles refreshed':'Profile awaryjne odświeżone',
    'Lorebooks refreshed':'Lorebooki odświeżone','System prompt reset to default':'Prompt systemowy zresetowany',
    'Prompt copied':'Prompt skopiowany','Schema reset to default':'Schemat zresetowany',
    'Schema copied':'Schemat skopiowany','Done':'Gotowe','Failed':'Niepowodzenie',
    'Data cleared':'Dane wyczyszczone','Cleared':'Wyczyszczono','Settings reset to defaults':'Ustawienia zresetowane',
    'SP Log copied':'Dziennik SP skopiowany','Console copied':'Konsola skopiowana',
    'Copy failed':'Kopiowanie nie powiodło się','No API response captured yet':'Brak przechwyconej odpowiedzi API',
    'Last response copied':'Ostatnia odpowiedź skopiowana','Debug log copied':'Dziennik debugowania skopiowany',
    'Invalid JSON':'Nieprawidłowy JSON',
    // Story ideas
    'Story direction sent':'Kierunek fabuły wysłany','Story idea copied':'Pomysł na fabułę skopiowany',
    // Custom panels
    'Panel name':'Nazwa panelu','Key':'Klucz','Label':'Etykieta','Type':'Typ','LLM Hint':'Wskazówka LLM',
    'Add Field':'Dodaj pole','Delete panel':'Usuń panel','Remove this field':'Usuń to pole',
    'Drag to reorder':'Przeciągnij, aby zmienić kolejność','No custom panels yet':'Brak własnych paneli',
    // Quest dialog
    'Quest name':'Nazwa misji','1-2 sentences from your perspective':'1-2 zdania z Twojej perspektywy',
},
'Ukrainian': {
    // Section headers
    'Scene Details':'Деталі сцени','Quest Journal':'Журнал квестів','Relationships':'Стосунки',
    'Characters':'Персонажі','Story Ideas':'Ідеї для сюжету','Inner Thoughts':'Внутрішні думки',
    'North Star':'Путівна зірка','Main Quests':'Основні квести','Side Quests':'Побічні квести',
    'Active Tasks':'Активні завдання',
    // Badges
    'new':'новий','updated':'оновлено','resolved':'завершено',
    // Buttons & actions
    'Add quest':'Додати квест','Cancel':'Скасувати','Add Quest':'Додати','Regenerate all':'Оновити все',
    'Mark as completed':'Позначити виконаним','Remove quest':'Видалити квест','Restore quest':'Відновити квест',
    'Stop Generation':'■ Зупинити','Jump to latest':'До останнього','Copy':'Копіювати',
    // Empty states
    'No scene data yet':'Немає даних сцени','Send a message or click ⟳ to generate.':'Надішліть повідомлення або натисніть ⟳.',
    'No active storyline quests':'Немає активних сюжетних квестів','No side quests discovered':'Побічних квестів немає',
    'No immediate tasks':'Немає термінових завдань','Not yet revealed':'Ще не розкрито',
    // Form labels
    'Name':'Ім\'я','Urgency':'Терміновість','Details':'Деталі','Critical':'Критична','High':'Висока','Moderate':'Середня','Low':'Низька',
    // Tooltips
    'Toggle edit mode':'Режим редагування','Show empty fields':'Показати порожні поля',
    'Snap to left of chat':'Прикріпити ліворуч','Ghost mode':'Привидний режим','Regenerate thoughts':'Оновити думки',
    'Hide thoughts':'Сховати думки','Hide panel':'Сховати панель','Panel Manager':'Менеджер панелей',
    // Loading
    'Generating Scene':'Генерація сцени','Updating thoughts':'Оновлення думок','Analyzing context':'Аналіз контексту',
    // Diff viewer
    'Payload Inspector':'Інспектор даних','Changes Only':'Лише зміни','Full Diff':'Повне порівняння',
    'Side by Side':'Поруч','Delta Payload':'Дельта','Previous':'Попередній','Current':'Поточний','Full Payload':'Повні дані',
    // Toasts
    'Completed':'Завершено','Removed':'Видалено','Added':'Додано','Regenerated':'Оновлено','Regeneration failed':'Помилка оновлення',
    'Remove Quest':'Видалити квест','Copied!':'Скопійовано!',
    // Settings
    'General':'Загальне','Enable ScenePulse':'Увімкнути ScenePulse','Auto-generate on AI messages':'Автогенерація при відповідях ШІ',
    'Show thought bubbles':'Показувати бульбашки думок','Weather overlay effects':'Ефекти погоди','Time-of-day ambience':'Освітлення часу доби',
    'Font scale':'Масштаб шрифту','Language':'Мова','Auto-detect':'Автовизначення',
    'Show developer tools':'Інструменти розробника',
    // Field labels — scene
    'Topic':'Тема','Mood':'Настрій','Interaction':'Взаємодія','Tension':'Напруга',
    'Summary':'Резюме','Sounds':'Звуки','Present':'Присутні',
    // Field labels — character appearance
    'Hair':'Волосся','Face':'Обличчя','Outfit':'Вбрання','Dress':'Одяг','Posture':'Поза',
    'Proximity':'Близькість','Physical':'Фізичне','Inventory':'Інвентар',
    // Field labels — goals
    'Need':'Потреба','Short-Term':'Короткостр.','Long-Term':'Довгостр.',
    // Field labels — relationship meta
    'Time Known':'Знайомство','Milestone':'Віха',
    // Field labels — meters
    'Affection':'Прив\'язаність','Trust':'Довіра','Desire':'Бажання','Stress':'Стрес','Compat':'Сумісн.',
    // Field labels — fertility
    'Status':'Статус','Reason':'Причина','Cycle Phase':'Фаза циклу','Cycle Day':'День циклу',
    'Window':'Вікно','Pregnancy':'Вагітність','Preg. Week':'Тижд. вагітн.','Notes':'Нотатки',
    'Fertility: N/A':'Фертильність: Н/Д',
    // Stats footer
    'Together':'Спільно','Separate':'Окремо','Inspect':'Інспекція',
    'Auto':'Авто','Backup':'Резерв','Fallback':'Відкат','Full regen':'Повна ген.','Settings':'Налаштування',
    'Msg regen':'Оновл. повід.','Thoughts':'Думки',
    'Message index':'Індекс повідомлення','Estimated tokens':'Оцінка токенів','Generation time':'Час генерації',
    // Panel Manager
    'Enable All':'Увімкнути все','Disable All':'Вимкнути все','Custom Panels':'Власні панелі',
    '+ Add Custom Panel':'+ Додати панель',
    'Expand/Collapse sections':'Розгорнути/згорнути секції','Condense view':'Компактний вигляд',
    // Edit mode
    'Click any highlighted field to edit':'Натисніть на підсвічене поле для редагування',
    'Edit Mode On':'Режим редагування увімк.','Edit Mode Off':'Режим редагування вимк.',
    // Mobile
    'Scene updated':'Сцену оновлено','Open ScenePulse':'Відкрити ScenePulse',
    // Loading
    'Updating scene data':'Оновлення даних сцени','Reading context and analyzing characters':'Читання контексту та аналіз персонажів',
    // Settings sections/labels
    'Setup Guide':'Посібник','Guided Tour':'Екскурсія','Context msgs':'Контекстні повід.',
    'Max retries':'Макс. спроб','Delta mode':'Режим дельта','Injection Method':'Метод вставки',
    'Mode':'Режим','Fallback Recovery':'Відновлення',
    'Enable automatic fallback':'Автоматичний відкат','Fallback Profile':'Профіль відкату',
    'Fallback Preset':'Пресет відкату','Refresh Profiles':'Оновити профілі',
    'Connection Profile':'Профіль з\'єднання','Chat Completion Preset':'Пресет завершення чату',
    'Prompt Mode':'Режим промпту','Context Embedding':'Вбудовування контексту',
    'Embed snapshots':'Вбудувати знімки','Embed as role':'Вбудувати як роль',
    'System':'Система','User':'Користувач','Assistant':'Асистент',
    'Lorebooks':'Книги знань','Filter Mode':'Режим фільтра','Refresh Lorebooks':'Оновити книги знань',
    'System Prompt':'Системний промпт','JSON Schema':'JSON-схема','Reset to Default':'Скинути до замовч.',
    'Actions':'Дії','Generate':'Генерувати','Clear Data':'Очистити дані','Reset Settings':'Скинути налаштування',
    'Debug':'Відлагодження','SP Log':'Журнал SP','View Log':'Переглянути журнал','Console':'Консоль',
    'Last Response':'Остання відповідь','Active':'Активно','Off':'Вимк.',
    // Toast messages
    'Profiles refreshed':'Профілі оновлено','Fallback profiles refreshed':'Профілі відкату оновлено',
    'Lorebooks refreshed':'Книги знань оновлено','System prompt reset to default':'Системний промпт скинуто',
    'Prompt copied':'Промпт скопійовано','Schema reset to default':'Схему скинуто',
    'Schema copied':'Схему скопійовано','Done':'Готово','Failed':'Помилка',
    'Data cleared':'Дані очищено','Cleared':'Очищено','Settings reset to defaults':'Налаштування скинуто',
    'SP Log copied':'Журнал SP скопійовано','Console copied':'Консоль скопійовано',
    'Copy failed':'Помилка копіювання','No API response captured yet':'Немає захопленої відповіді API',
    'Last response copied':'Останню відповідь скопійовано','Debug log copied':'Журнал відлагодження скопійовано',
    'Invalid JSON':'Невірний JSON',
    // Story ideas
    'Story direction sent':'Напрямок історії надіслано','Story idea copied':'Ідею для сюжету скопійовано',
    // Custom panels
    'Panel name':'Назва панелі','Key':'Ключ','Label':'Мітка','Type':'Тип','LLM Hint':'Підказка LLM',
    'Add Field':'Додати поле','Delete panel':'Видалити панель','Remove this field':'Видалити поле',
    'Drag to reorder':'Перетягніть для сортування','No custom panels yet':'Немає власних панелей',
    // Quest dialog
    'Quest name':'Назва квесту','1-2 sentences from your perspective':'1-2 речення від вашої особи',
},
'Indonesian': {
    // Section headers
    'Scene Details':'Detail Adegan','Quest Journal':'Jurnal Misi','Relationships':'Hubungan',
    'Characters':'Karakter','Story Ideas':'Ide Cerita','Inner Thoughts':'Pikiran Batin',
    'North Star':'Bintang Utara','Main Quests':'Misi Utama','Side Quests':'Misi Sampingan',
    'Active Tasks':'Tugas Aktif',
    // Badges
    'new':'baru','updated':'diperbarui','resolved':'selesai',
    // Buttons & actions
    'Add quest':'Tambah misi','Cancel':'Batal','Add Quest':'Tambah','Regenerate all':'Perbarui semua',
    'Mark as completed':'Tandai selesai','Remove quest':'Hapus misi','Restore quest':'Pulihkan misi',
    'Stop Generation':'■ Hentikan','Jump to latest':'Ke terbaru','Copy':'Salin',
    // Empty states
    'No scene data yet':'Belum ada data adegan','Send a message or click ⟳ to generate.':'Kirim pesan atau klik ⟳ untuk membuat.',
    'No active storyline quests':'Tidak ada misi cerita aktif','No side quests discovered':'Tidak ada misi sampingan',
    'No immediate tasks':'Tidak ada tugas mendesak','Not yet revealed':'Belum terungkap',
    // Form labels
    'Name':'Nama','Urgency':'Urgensi','Details':'Detail','Critical':'Kritis','High':'Tinggi','Moderate':'Sedang','Low':'Rendah',
    // Tooltips
    'Toggle edit mode':'Alihkan mode edit','Show empty fields':'Tampilkan bidang kosong',
    'Snap to left of chat':'Pasang di kiri obrolan','Ghost mode':'Mode hantu','Regenerate thoughts':'Perbarui pikiran',
    'Hide thoughts':'Sembunyikan pikiran','Hide panel':'Sembunyikan panel','Panel Manager':'Pengelola Panel',
    // Loading
    'Generating Scene':'Membuat adegan','Updating thoughts':'Memperbarui pikiran','Analyzing context':'Menganalisis konteks',
    // Diff viewer
    'Payload Inspector':'Inspektur Data','Changes Only':'Hanya perubahan','Full Diff':'Perbandingan lengkap',
    'Side by Side':'Berdampingan','Delta Payload':'Delta','Previous':'Sebelumnya','Current':'Saat ini','Full Payload':'Data lengkap',
    // Toasts
    'Completed':'Selesai','Removed':'Dihapus','Added':'Ditambahkan','Regenerated':'Diperbarui','Regeneration failed':'Pembaruan gagal',
    'Remove Quest':'Hapus misi','Copied!':'Disalin!',
    // Settings
    'General':'Umum','Enable ScenePulse':'Aktifkan ScenePulse','Auto-generate on AI messages':'Otomatis buat saat pesan AI',
    'Show thought bubbles':'Tampilkan gelembung pikiran','Weather overlay effects':'Efek cuaca','Time-of-day ambience':'Suasana waktu',
    'Font scale':'Skala font','Language':'Bahasa','Auto-detect':'Deteksi otomatis',
    'Show developer tools':'Alat pengembang',
    // Field labels — scene
    'Topic':'Topik','Mood':'Suasana hati','Interaction':'Interaksi','Tension':'Ketegangan',
    'Summary':'Ringkasan','Sounds':'Suara','Present':'Hadir',
    // Field labels — character appearance
    'Hair':'Rambut','Face':'Wajah','Outfit':'Pakaian','Dress':'Busana','Posture':'Postur',
    'Proximity':'Kedekatan','Physical':'Fisik','Inventory':'Inventaris',
    // Field labels — goals
    'Need':'Kebutuhan','Short-Term':'Jangka pendek','Long-Term':'Jangka panjang',
    // Field labels — relationship meta
    'Time Known':'Lama kenal','Milestone':'Tonggak',
    // Field labels — meters
    'Affection':'Kasih sayang','Trust':'Kepercayaan','Desire':'Hasrat','Stress':'Stres','Compat':'Kecocokan',
    // Field labels — fertility
    'Status':'Status','Reason':'Alasan','Cycle Phase':'Fase siklus','Cycle Day':'Hari siklus',
    'Window':'Jendela','Pregnancy':'Kehamilan','Preg. Week':'Minggu hamil','Notes':'Catatan',
    'Fertility: N/A':'Kesuburan: Tidak berlaku',
    // Stats footer
    'Together':'Gabung','Separate':'Pisah','Inspect':'Inspeksi',
    'Auto':'Otomatis','Backup':'Cadangan','Fallback':'Cadangan alt.','Full regen':'Regen penuh','Settings':'Pengaturan',
    'Msg regen':'Regen pesan','Thoughts':'Pikiran',
    'Message index':'Indeks pesan','Estimated tokens':'Token perkiraan','Generation time':'Waktu pembuatan',
    // Panel Manager
    'Enable All':'Aktifkan semua','Disable All':'Nonaktifkan semua','Custom Panels':'Panel Kustom',
    '+ Add Custom Panel':'+ Tambah Panel Kustom',
    'Expand/Collapse sections':'Perluas/Ciutkan bagian','Condense view':'Tampilan ringkas',
    // Edit mode
    'Click any highlighted field to edit':'Klik bidang yang disorot untuk mengedit',
    'Edit Mode On':'Mode edit aktif','Edit Mode Off':'Mode edit nonaktif',
    // Mobile
    'Scene updated':'Adegan diperbarui','Open ScenePulse':'Buka ScenePulse',
    // Loading
    'Updating scene data':'Memperbarui data adegan','Reading context and analyzing characters':'Membaca konteks dan menganalisis karakter',
    // Settings sections/labels
    'Setup Guide':'Panduan Pengaturan','Guided Tour':'Tur Panduan','Context msgs':'Pesan konteks',
    'Max retries':'Maks. percobaan','Delta mode':'Mode delta','Injection Method':'Metode injeksi',
    'Mode':'Mode','Fallback Recovery':'Pemulihan cadangan',
    'Enable automatic fallback':'Aktifkan cadangan otomatis','Fallback Profile':'Profil cadangan',
    'Fallback Preset':'Preset cadangan','Refresh Profiles':'Segarkan profil',
    'Connection Profile':'Profil koneksi','Chat Completion Preset':'Preset penyelesaian obrolan',
    'Prompt Mode':'Mode prompt','Context Embedding':'Penyematan konteks',
    'Embed snapshots':'Sematkan snapshot','Embed as role':'Sematkan sebagai peran',
    'System':'Sistem','User':'Pengguna','Assistant':'Asisten',
    'Lorebooks':'Lorebook','Filter Mode':'Mode filter','Refresh Lorebooks':'Segarkan lorebook',
    'System Prompt':'Prompt sistem','JSON Schema':'Skema JSON','Reset to Default':'Kembalikan ke default',
    'Actions':'Tindakan','Generate':'Buat','Clear Data':'Hapus data','Reset Settings':'Reset pengaturan',
    'Debug':'Debug','SP Log':'Log SP','View Log':'Lihat log','Console':'Konsol',
    'Last Response':'Respons terakhir','Active':'Aktif','Off':'Mati',
    // Toast messages
    'Profiles refreshed':'Profil disegarkan','Fallback profiles refreshed':'Profil cadangan disegarkan',
    'Lorebooks refreshed':'Lorebook disegarkan','System prompt reset to default':'Prompt sistem direset',
    'Prompt copied':'Prompt disalin','Schema reset to default':'Skema direset',
    'Schema copied':'Skema disalin','Done':'Selesai','Failed':'Gagal',
    'Data cleared':'Data dihapus','Cleared':'Dihapus','Settings reset to defaults':'Pengaturan direset',
    'SP Log copied':'Log SP disalin','Console copied':'Konsol disalin',
    'Copy failed':'Gagal menyalin','No API response captured yet':'Belum ada respons API',
    'Last response copied':'Respons terakhir disalin','Debug log copied':'Log debug disalin',
    'Invalid JSON':'JSON tidak valid',
    // Story ideas
    'Story direction sent':'Arah cerita terkirim','Story idea copied':'Ide cerita disalin',
    // Custom panels
    'Panel name':'Nama panel','Key':'Kunci','Label':'Label','Type':'Tipe','LLM Hint':'Petunjuk LLM',
    'Add Field':'Tambah bidang','Delete panel':'Hapus panel','Remove this field':'Hapus bidang ini',
    'Drag to reorder':'Seret untuk mengurutkan','No custom panels yet':'Belum ada panel kustom',
    // Quest dialog
    'Quest name':'Nama misi','1-2 sentences from your perspective':'1-2 kalimat dari sudut pandang Anda',
},
'Dutch': {
    // Section headers
    'Scene Details':'Scènedetails','Quest Journal':'Questjournaal','Relationships':'Relaties',
    'Characters':'Personages','Story Ideas':'Verhaalideeën','Inner Thoughts':'Innerlijke gedachten',
    'North Star':'Poolster','Main Quests':'Hoofdquests','Side Quests':'Zijquests',
    'Active Tasks':'Actieve taken',
    // Badges
    'new':'nieuw','updated':'bijgewerkt','resolved':'voltooid',
    // Buttons & actions
    'Add quest':'Quest toevoegen','Cancel':'Annuleren','Add Quest':'Toevoegen','Regenerate all':'Alles opnieuw genereren',
    'Mark as completed':'Markeer als voltooid','Remove quest':'Quest verwijderen','Restore quest':'Quest herstellen',
    'Stop Generation':'■ Stoppen','Jump to latest':'Naar nieuwste','Copy':'Kopiëren',
    // Empty states
    'No scene data yet':'Nog geen scènegegevens','Send a message or click ⟳ to generate.':'Stuur een bericht of klik op ⟳.',
    'No active storyline quests':'Geen actieve verhaalquests','No side quests discovered':'Geen zijquests ontdekt',
    'No immediate tasks':'Geen dringende taken','Not yet revealed':'Nog niet onthuld',
    // Form labels
    'Name':'Naam','Urgency':'Urgentie','Details':'Details','Critical':'Kritiek','High':'Hoog','Moderate':'Gemiddeld','Low':'Laag',
    // Tooltips
    'Toggle edit mode':'Bewerkingsmodus','Show empty fields':'Lege velden tonen',
    'Snap to left of chat':'Links van chat vastzetten','Ghost mode':'Spookmodus','Regenerate thoughts':'Gedachten opnieuw genereren',
    'Hide thoughts':'Gedachten verbergen','Hide panel':'Paneel verbergen','Panel Manager':'Paneelbeheer',
    // Loading
    'Generating Scene':'Scène genereren','Updating thoughts':'Gedachten bijwerken','Analyzing context':'Context analyseren',
    // Diff viewer
    'Payload Inspector':'Gegevensinspecteur','Changes Only':'Alleen wijzigingen','Full Diff':'Volledige vergelijking',
    'Side by Side':'Naast elkaar','Delta Payload':'Delta','Previous':'Vorige','Current':'Huidig','Full Payload':'Volledige gegevens',
    // Toasts
    'Completed':'Voltooid','Removed':'Verwijderd','Added':'Toegevoegd','Regenerated':'Opnieuw gegenereerd','Regeneration failed':'Opnieuw genereren mislukt',
    'Remove Quest':'Quest verwijderen','Copied!':'Gekopieerd!',
    // Settings
    'General':'Algemeen','Enable ScenePulse':'ScenePulse inschakelen','Auto-generate on AI messages':'Auto-genereren bij AI-berichten',
    'Show thought bubbles':'Gedachtenbellen tonen','Weather overlay effects':'Weereffecten','Time-of-day ambience':'Dagtijdsfeer',
    'Font scale':'Lettertypeschaal','Language':'Taal','Auto-detect':'Automatisch detecteren',
    'Show developer tools':'Ontwikkelaarstools',
    // Field labels — scene
    'Topic':'Onderwerp','Mood':'Stemming','Interaction':'Interactie','Tension':'Spanning',
    'Summary':'Samenvatting','Sounds':'Geluiden','Present':'Aanwezig',
    // Field labels — character appearance
    'Hair':'Haar','Face':'Gezicht','Outfit':'Outfit','Dress':'Kleding','Posture':'Houding',
    'Proximity':'Nabijheid','Physical':'Fysiek','Inventory':'Inventaris',
    // Field labels — goals
    'Need':'Behoefte','Short-Term':'Korte termijn','Long-Term':'Lange termijn',
    // Field labels — relationship meta
    'Time Known':'Ken-duur','Milestone':'Mijlpaal',
    // Field labels — meters
    'Affection':'Genegenheid','Trust':'Vertrouwen','Desire':'Verlangen','Stress':'Stress','Compat':'Compat.',
    // Field labels — fertility
    'Status':'Status','Reason':'Reden','Cycle Phase':'Cyclusfase','Cycle Day':'Cyclusdag',
    'Window':'Venster','Pregnancy':'Zwangerschap','Preg. Week':'Zwang. week','Notes':'Notities',
    'Fertility: N/A':'Vruchtbaarheid: NVT',
    // Stats footer
    'Together':'Samen','Separate':'Apart','Inspect':'Inspecteren',
    'Auto':'Auto','Backup':'Backup','Fallback':'Terugval','Full regen':'Volledige regen.','Settings':'Instellingen',
    'Msg regen':'Bericht regen.','Thoughts':'Gedachten',
    'Message index':'Berichtindex','Estimated tokens':'Geschatte tokens','Generation time':'Generatietijd',
    // Panel Manager
    'Enable All':'Alles inschakelen','Disable All':'Alles uitschakelen','Custom Panels':'Aangepaste panelen',
    '+ Add Custom Panel':'+ Aangepast paneel toevoegen',
    'Expand/Collapse sections':'Secties uitvouwen/invouwen','Condense view':'Compacte weergave',
    // Edit mode
    'Click any highlighted field to edit':'Klik op een gemarkeerd veld om te bewerken',
    'Edit Mode On':'Bewerkingsmodus aan','Edit Mode Off':'Bewerkingsmodus uit',
    // Mobile
    'Scene updated':'Scène bijgewerkt','Open ScenePulse':'ScenePulse openen',
    // Loading
    'Updating scene data':'Scènegegevens bijwerken','Reading context and analyzing characters':'Context lezen en personages analyseren',
    // Settings sections/labels
    'Setup Guide':'Installatiehandleiding','Guided Tour':'Rondleiding','Context msgs':'Contextberichten',
    'Max retries':'Max. pogingen','Delta mode':'Deltamodus','Injection Method':'Injectiemethode',
    'Mode':'Modus','Fallback Recovery':'Terugvalherstel',
    'Enable automatic fallback':'Automatische terugval','Fallback Profile':'Terugvalprofiel',
    'Fallback Preset':'Terugvalpreset','Refresh Profiles':'Profielen vernieuwen',
    'Connection Profile':'Verbindingsprofiel','Chat Completion Preset':'Chatvoltooiingspreset',
    'Prompt Mode':'Promptmodus','Context Embedding':'Contextinsluiting',
    'Embed snapshots':'Snapshots insluiten','Embed as role':'Als rol insluiten',
    'System':'Systeem','User':'Gebruiker','Assistant':'Assistent',
    'Lorebooks':'Lorebooks','Filter Mode':'Filtermodus','Refresh Lorebooks':'Lorebooks vernieuwen',
    'System Prompt':'Systeemprompt','JSON Schema':'JSON-schema','Reset to Default':'Herstellen naar standaard',
    'Actions':'Acties','Generate':'Genereren','Clear Data':'Gegevens wissen','Reset Settings':'Instellingen resetten',
    'Debug':'Debug','SP Log':'SP-logboek','View Log':'Logboek bekijken','Console':'Console',
    'Last Response':'Laatste antwoord','Active':'Actief','Off':'Uit',
    // Toast messages
    'Profiles refreshed':'Profielen vernieuwd','Fallback profiles refreshed':'Terugvalprofielen vernieuwd',
    'Lorebooks refreshed':'Lorebooks vernieuwd','System prompt reset to default':'Systeemprompt hersteld',
    'Prompt copied':'Prompt gekopieerd','Schema reset to default':'Schema hersteld',
    'Schema copied':'Schema gekopieerd','Done':'Klaar','Failed':'Mislukt',
    'Data cleared':'Gegevens gewist','Cleared':'Gewist','Settings reset to defaults':'Instellingen hersteld',
    'SP Log copied':'SP-logboek gekopieerd','Console copied':'Console gekopieerd',
    'Copy failed':'Kopiëren mislukt','No API response captured yet':'Nog geen API-antwoord vastgelegd',
    'Last response copied':'Laatste antwoord gekopieerd','Debug log copied':'Debuglogboek gekopieerd',
    'Invalid JSON':'Ongeldige JSON',
    // Story ideas
    'Story direction sent':'Verhaalrichting verzonden','Story idea copied':'Verhaalidee gekopieerd',
    // Custom panels
    'Panel name':'Paneelnaam','Key':'Sleutel','Label':'Label','Type':'Type','LLM Hint':'LLM-hint',
    'Add Field':'Veld toevoegen','Delete panel':'Paneel verwijderen','Remove this field':'Dit veld verwijderen',
    'Drag to reorder':'Slepen om te herschikken','No custom panels yet':'Nog geen aangepaste panelen',
    // Quest dialog
    'Quest name':'Questnaam','1-2 sentences from your perspective':'1-2 zinnen vanuit jouw perspectief',
},
'Romanian': {
    // Section headers
    'Scene Details':'Detalii scenă','Quest Journal':'Jurnal de misiuni','Relationships':'Relații',
    'Characters':'Personaje','Story Ideas':'Idei de poveste','Inner Thoughts':'Gânduri interioare',
    'North Star':'Steaua polară','Main Quests':'Misiuni principale','Side Quests':'Misiuni secundare',
    'Active Tasks':'Sarcini active',
    // Badges
    'new':'nou','updated':'actualizat','resolved':'rezolvat',
    // Buttons & actions
    'Add quest':'Adaugă misiune','Cancel':'Anulează','Add Quest':'Adaugă','Regenerate all':'Regenerează tot',
    'Mark as completed':'Marchează finalizat','Remove quest':'Elimină misiunea','Restore quest':'Restaurează misiunea',
    'Stop Generation':'■ Oprește','Jump to latest':'La cel mai recent','Copy':'Copiază',
    // Empty states
    'No scene data yet':'Nicio dată de scenă','Send a message or click ⟳ to generate.':'Trimite un mesaj sau apasă ⟳.',
    'No active storyline quests':'Nicio misiune activă','No side quests discovered':'Nicio misiune secundară',
    'No immediate tasks':'Nicio sarcină imediată','Not yet revealed':'Nedezvăluit încă',
    // Form labels
    'Name':'Nume','Urgency':'Urgență','Details':'Detalii','Critical':'Critică','High':'Ridicată','Moderate':'Medie','Low':'Scăzută',
    // Tooltips
    'Toggle edit mode':'Comută editarea','Show empty fields':'Afișează câmpuri goale',
    'Snap to left of chat':'Fixează la stânga','Ghost mode':'Mod fantomă','Regenerate thoughts':'Regenerează gânduri',
    'Hide thoughts':'Ascunde gânduri','Hide panel':'Ascunde panoul','Panel Manager':'Manager panouri',
    // Loading
    'Generating Scene':'Generare scenă','Updating thoughts':'Actualizare gânduri','Analyzing context':'Analiză context',
    // Diff viewer
    'Payload Inspector':'Inspector date','Changes Only':'Doar modificări','Full Diff':'Comparație completă',
    'Side by Side':'Alăturat','Delta Payload':'Delta','Previous':'Anterior','Current':'Curent','Full Payload':'Date complete',
    // Toasts
    'Completed':'Finalizat','Removed':'Eliminat','Added':'Adăugat','Regenerated':'Regenerat','Regeneration failed':'Regenerare eșuată',
    'Remove Quest':'Elimină misiunea','Copied!':'Copiat!',
    // Settings
    'General':'General','Enable ScenePulse':'Activează ScenePulse','Auto-generate on AI messages':'Auto-generare la mesaje AI',
    'Show thought bubbles':'Afișează bule de gândire','Weather overlay effects':'Efecte meteo','Time-of-day ambience':'Ambient de zi',
    'Font scale':'Scală font','Language':'Limbă','Auto-detect':'Detectare automată',
    'Show developer tools':'Instrumente dezvoltator',
    // Field labels — scene
    'Topic':'Subiect','Mood':'Dispoziție','Interaction':'Interacțiune','Tension':'Tensiune',
    'Summary':'Rezumat','Sounds':'Sunete','Present':'Prezenți',
    // Field labels — character appearance
    'Hair':'Păr','Face':'Față','Outfit':'Ținută','Dress':'Îmbrăcăminte','Posture':'Postură',
    'Proximity':'Proximitate','Physical':'Fizic','Inventory':'Inventar',
    // Field labels — goals
    'Need':'Nevoie','Short-Term':'Termen scurt','Long-Term':'Termen lung',
    // Field labels — relationship meta
    'Time Known':'Timp cunoscut','Milestone':'Reper',
    // Field labels — meters
    'Affection':'Afecțiune','Trust':'Încredere','Desire':'Dorință','Stress':'Stres','Compat':'Compat.',
    // Field labels — fertility
    'Status':'Stare','Reason':'Motiv','Cycle Phase':'Faza ciclului','Cycle Day':'Ziua ciclului',
    'Window':'Fereastră','Pregnancy':'Sarcină','Preg. Week':'Săpt. sarcină','Notes':'Note',
    'Fertility: N/A':'Fertilitate: N/A',
    // Stats footer
    'Together':'Împreună','Separate':'Separat','Inspect':'Inspectează',
    'Auto':'Auto','Backup':'Copie','Fallback':'Rezervă','Full regen':'Regen. completă','Settings':'Setări',
    'Msg regen':'Regen. mesaj','Thoughts':'Gânduri',
    'Message index':'Index mesaj','Estimated tokens':'Tokeni estimați','Generation time':'Timp generare',
    // Panel Manager
    'Enable All':'Activează tot','Disable All':'Dezactivează tot','Custom Panels':'Panouri personalizate',
    '+ Add Custom Panel':'+ Adaugă panou',
    'Expand/Collapse sections':'Extinde/Restrânge secțiuni','Condense view':'Vedere compactă',
    // Edit mode
    'Click any highlighted field to edit':'Apasă pe un câmp evidențiat pentru editare',
    'Edit Mode On':'Mod editare activat','Edit Mode Off':'Mod editare dezactivat',
    // Mobile
    'Scene updated':'Scenă actualizată','Open ScenePulse':'Deschide ScenePulse',
    // Loading
    'Updating scene data':'Actualizare date scenă','Reading context and analyzing characters':'Citire context și analiză personaje',
    // Settings sections/labels
    'Setup Guide':'Ghid de configurare','Guided Tour':'Tur ghidat','Context msgs':'Mesaje context',
    'Max retries':'Max. încercări','Delta mode':'Mod delta','Injection Method':'Metodă de injecție',
    'Mode':'Mod','Fallback Recovery':'Recuperare de rezervă',
    'Enable automatic fallback':'Activează rezerva automată','Fallback Profile':'Profil de rezervă',
    'Fallback Preset':'Preset de rezervă','Refresh Profiles':'Reîmprospătează profiluri',
    'Connection Profile':'Profil de conexiune','Chat Completion Preset':'Preset completare chat',
    'Prompt Mode':'Mod prompt','Context Embedding':'Încorporare context',
    'Embed snapshots':'Încorporează instantanee','Embed as role':'Încorporează ca rol',
    'System':'Sistem','User':'Utilizator','Assistant':'Asistent',
    'Lorebooks':'Lorebook-uri','Filter Mode':'Mod filtru','Refresh Lorebooks':'Reîmprospătează lorebook-uri',
    'System Prompt':'Prompt sistem','JSON Schema':'Schemă JSON','Reset to Default':'Resetare la implicit',
    'Actions':'Acțiuni','Generate':'Generează','Clear Data':'Șterge date','Reset Settings':'Resetare setări',
    'Debug':'Depanare','SP Log':'Jurnal SP','View Log':'Vezi jurnal','Console':'Consolă',
    'Last Response':'Ultimul răspuns','Active':'Activ','Off':'Oprit',
    // Toast messages
    'Profiles refreshed':'Profiluri reîmprospătate','Fallback profiles refreshed':'Profiluri de rezervă reîmprospătate',
    'Lorebooks refreshed':'Lorebook-uri reîmprospătate','System prompt reset to default':'Prompt sistem resetat',
    'Prompt copied':'Prompt copiat','Schema reset to default':'Schemă resetată',
    'Schema copied':'Schemă copiată','Done':'Gata','Failed':'Eșuat',
    'Data cleared':'Date șterse','Cleared':'Șters','Settings reset to defaults':'Setări resetate',
    'SP Log copied':'Jurnal SP copiat','Console copied':'Consolă copiată',
    'Copy failed':'Copiere eșuată','No API response captured yet':'Niciun răspuns API capturat',
    'Last response copied':'Ultimul răspuns copiat','Debug log copied':'Jurnal depanare copiat',
    'Invalid JSON':'JSON invalid',
    // Story ideas
    'Story direction sent':'Direcție poveste trimisă','Story idea copied':'Idee de poveste copiată',
    // Custom panels
    'Panel name':'Nume panou','Key':'Cheie','Label':'Etichetă','Type':'Tip','LLM Hint':'Indiciu LLM',
    'Add Field':'Adaugă câmp','Delete panel':'Șterge panoul','Remove this field':'Elimină câmpul',
    'Drag to reorder':'Trage pentru reordonare','No custom panels yet':'Niciun panou personalizat',
    // Quest dialog
    'Quest name':'Nume misiune','1-2 sentences from your perspective':'1-2 propoziții din perspectiva ta',
},
'Czech': {
    // Section headers
    'Scene Details':'Detaily scény','Quest Journal':'Deník úkolů','Relationships':'Vztahy',
    'Characters':'Postavy','Story Ideas':'Nápady na příběh','Inner Thoughts':'Vnitřní myšlenky',
    'North Star':'Polárka','Main Quests':'Hlavní úkoly','Side Quests':'Vedlejší úkoly',
    'Active Tasks':'Aktivní úkoly',
    // Badges
    'new':'nový','updated':'aktualizov.','resolved':'dokončen',
    // Buttons & actions
    'Add quest':'Přidat úkol','Cancel':'Zrušit','Add Quest':'Přidat','Regenerate all':'Obnovit vše',
    'Mark as completed':'Označit jako dokončené','Remove quest':'Odstranit úkol','Restore quest':'Obnovit úkol',
    'Stop Generation':'■ Zastavit','Jump to latest':'Na nejnovější','Copy':'Kopírovat',
    // Empty states
    'No scene data yet':'Žádná data scény','Send a message or click ⟳ to generate.':'Pošlete zprávu nebo klikněte ⟳.',
    'No active storyline quests':'Žádné aktivní příběhové úkoly','No side quests discovered':'Žádné vedlejší úkoly',
    'No immediate tasks':'Žádné urgentní úkoly','Not yet revealed':'Dosud neodhaleno',
    // Form labels
    'Name':'Název','Urgency':'Naléhavost','Details':'Detaily','Critical':'Kritická','High':'Vysoká','Moderate':'Střední','Low':'Nízká',
    // Tooltips
    'Toggle edit mode':'Přepnout režim úprav','Show empty fields':'Zobrazit prázdná pole',
    'Snap to left of chat':'Připnout vlevo','Ghost mode':'Režim ducha','Regenerate thoughts':'Obnovit myšlenky',
    'Hide thoughts':'Skrýt myšlenky','Hide panel':'Skrýt panel','Panel Manager':'Správce panelů',
    // Loading
    'Generating Scene':'Generování scény','Updating thoughts':'Aktualizace myšlenek','Analyzing context':'Analýza kontextu',
    // Diff viewer
    'Payload Inspector':'Inspektor dat','Changes Only':'Pouze změny','Full Diff':'Úplné srovnání',
    'Side by Side':'Vedle sebe','Delta Payload':'Delta','Previous':'Předchozí','Current':'Aktuální','Full Payload':'Úplná data',
    // Toasts
    'Completed':'Dokončeno','Removed':'Odstraněno','Added':'Přidáno','Regenerated':'Obnoveno','Regeneration failed':'Obnova selhala',
    'Remove Quest':'Odstranit úkol','Copied!':'Zkopírováno!',
    // Settings
    'General':'Obecné','Enable ScenePulse':'Aktivovat ScenePulse','Auto-generate on AI messages':'Automaticky generovat při AI zprávách',
    'Show thought bubbles':'Zobrazit bubliny myšlenek','Weather overlay effects':'Efekty počasí','Time-of-day ambience':'Atmosféra denní doby',
    'Font scale':'Měřítko písma','Language':'Jazyk','Auto-detect':'Automatická detekce',
    'Show developer tools':'Vývojářské nástroje',
    // Field labels — scene
    'Topic':'Téma','Mood':'Nálada','Interaction':'Interakce','Tension':'Napětí',
    'Summary':'Shrnutí','Sounds':'Zvuky','Present':'Přítomni',
    // Field labels — character appearance
    'Hair':'Vlasy','Face':'Obličej','Outfit':'Oblečení','Dress':'Oděv','Posture':'Postoj',
    'Proximity':'Blízkost','Physical':'Fyzický stav','Inventory':'Inventář',
    // Field labels — goals
    'Need':'Potřeba','Short-Term':'Krátkodobé','Long-Term':'Dlouhodobé',
    // Field labels — relationship meta
    'Time Known':'Doba známosti','Milestone':'Milník',
    // Field labels — meters
    'Affection':'Náklonnost','Trust':'Důvěra','Desire':'Touha','Stress':'Stres','Compat':'Kompatib.',
    // Field labels — fertility
    'Status':'Stav','Reason':'Důvod','Cycle Phase':'Fáze cyklu','Cycle Day':'Den cyklu',
    'Window':'Okno','Pregnancy':'Těhotenství','Preg. Week':'Týd. těhot.','Notes':'Poznámky',
    'Fertility: N/A':'Plodnost: Nepoužitelné',
    // Stats footer
    'Together':'Společně','Separate':'Odděleně','Inspect':'Inspekce',
    'Auto':'Auto','Backup':'Záloha','Fallback':'Záložní','Full regen':'Úplná regen.','Settings':'Nastavení',
    'Msg regen':'Regen. zprávy','Thoughts':'Myšlenky',
    'Message index':'Index zprávy','Estimated tokens':'Odhadované tokeny','Generation time':'Čas generování',
    // Panel Manager
    'Enable All':'Aktivovat vše','Disable All':'Deaktivovat vše','Custom Panels':'Vlastní panely',
    '+ Add Custom Panel':'+ Přidat vlastní panel',
    'Expand/Collapse sections':'Rozbalit/Sbalit sekce','Condense view':'Kompaktní zobrazení',
    // Edit mode
    'Click any highlighted field to edit':'Klikněte na zvýrazněné pole pro úpravu',
    'Edit Mode On':'Režim úprav zapnutý','Edit Mode Off':'Režim úprav vypnutý',
    // Mobile
    'Scene updated':'Scéna aktualizována','Open ScenePulse':'Otevřít ScenePulse',
    // Loading
    'Updating scene data':'Aktualizace dat scény','Reading context and analyzing characters':'Čtení kontextu a analýza postav',
    // Settings sections/labels
    'Setup Guide':'Průvodce nastavením','Guided Tour':'Prohlídka','Context msgs':'Kontextové zprávy',
    'Max retries':'Max. pokusů','Delta mode':'Režim delta','Injection Method':'Metoda injekce',
    'Mode':'Režim','Fallback Recovery':'Záložní obnovení',
    'Enable automatic fallback':'Automatický záložní režim','Fallback Profile':'Záložní profil',
    'Fallback Preset':'Záložní preset','Refresh Profiles':'Obnovit profily',
    'Connection Profile':'Profil připojení','Chat Completion Preset':'Preset dokončení chatu',
    'Prompt Mode':'Režim promptu','Context Embedding':'Vložení kontextu',
    'Embed snapshots':'Vložit snímky','Embed as role':'Vložit jako roli',
    'System':'Systém','User':'Uživatel','Assistant':'Asistent',
    'Lorebooks':'Lorebook','Filter Mode':'Režim filtru','Refresh Lorebooks':'Obnovit lorebook',
    'System Prompt':'Systémový prompt','JSON Schema':'JSON schéma','Reset to Default':'Obnovit výchozí',
    'Actions':'Akce','Generate':'Generovat','Clear Data':'Vymazat data','Reset Settings':'Resetovat nastavení',
    'Debug':'Ladění','SP Log':'SP záznam','View Log':'Zobrazit záznam','Console':'Konzole',
    'Last Response':'Poslední odpověď','Active':'Aktivní','Off':'Vypnuto',
    // Toast messages
    'Profiles refreshed':'Profily obnoveny','Fallback profiles refreshed':'Záložní profily obnoveny',
    'Lorebooks refreshed':'Lorebook obnoveny','System prompt reset to default':'Systémový prompt resetován',
    'Prompt copied':'Prompt zkopírován','Schema reset to default':'Schéma resetováno',
    'Schema copied':'Schéma zkopírováno','Done':'Hotovo','Failed':'Selhalo',
    'Data cleared':'Data vymazána','Cleared':'Vymazáno','Settings reset to defaults':'Nastavení resetována',
    'SP Log copied':'SP záznam zkopírován','Console copied':'Konzole zkopírována',
    'Copy failed':'Kopírování selhalo','No API response captured yet':'Žádná zachycená odpověď API',
    'Last response copied':'Poslední odpověď zkopírována','Debug log copied':'Ladicí záznam zkopírován',
    'Invalid JSON':'Neplatný JSON',
    // Story ideas
    'Story direction sent':'Směr příběhu odeslán','Story idea copied':'Nápad na příběh zkopírován',
    // Custom panels
    'Panel name':'Název panelu','Key':'Klíč','Label':'Popisek','Type':'Typ','LLM Hint':'Nápověda LLM',
    'Add Field':'Přidat pole','Delete panel':'Smazat panel','Remove this field':'Odstranit toto pole',
    'Drag to reorder':'Přetáhněte pro změnu pořadí','No custom panels yet':'Žádné vlastní panely',
    // Quest dialog
    'Quest name':'Název úkolu','1-2 sentences from your perspective':'1-2 věty z vaší perspektivy',
},
'Greek': {
    // Section headers
    'Scene Details':'Λεπτομέρειες σκηνής','Quest Journal':'Ημερολόγιο αποστολών','Relationships':'Σχέσεις',
    'Characters':'Χαρακτήρες','Story Ideas':'Ιδέες ιστορίας','Inner Thoughts':'Εσωτερικές σκέψεις',
    'North Star':'Πολικό αστέρι','Main Quests':'Κύριες αποστολές','Side Quests':'Δευτερεύουσες αποστολές',
    'Active Tasks':'Ενεργές εργασίες',
    // Badges
    'new':'νέο','updated':'ενημερ.','resolved':'ολοκληρ.',
    // Buttons & actions
    'Add quest':'Προσθήκη αποστολής','Cancel':'Ακύρωση','Add Quest':'Προσθήκη','Regenerate all':'Ανανέωση όλων',
    'Mark as completed':'Σημείωση ολοκλήρωσης','Remove quest':'Αφαίρεση αποστολής','Restore quest':'Επαναφορά αποστολής',
    'Stop Generation':'■ Διακοπή','Jump to latest':'Στο τελευταίο','Copy':'Αντιγραφή',
    // Empty states
    'No scene data yet':'Δεν υπάρχουν δεδομένα σκηνής','Send a message or click ⟳ to generate.':'Στείλτε μήνυμα ή πατήστε ⟳.',
    'No active storyline quests':'Δεν υπάρχουν ενεργές αποστολές','No side quests discovered':'Χωρίς δευτερεύουσες αποστολές',
    'No immediate tasks':'Χωρίς επείγουσες εργασίες','Not yet revealed':'Δεν έχει αποκαλυφθεί ακόμα',
    // Form labels
    'Name':'Όνομα','Urgency':'Επείγον','Details':'Λεπτομέρειες','Critical':'Κρίσιμη','High':'Υψηλή','Moderate':'Μέτρια','Low':'Χαμηλή',
    // Tooltips
    'Toggle edit mode':'Εναλλαγή επεξεργασίας','Show empty fields':'Εμφάνιση κενών πεδίων',
    'Snap to left of chat':'Προσάρτηση αριστερά','Ghost mode':'Λειτουργία φαντάσματος','Regenerate thoughts':'Ανανέωση σκέψεων',
    'Hide thoughts':'Απόκρυψη σκέψεων','Hide panel':'Απόκρυψη πάνελ','Panel Manager':'Διαχείριση πάνελ',
    // Loading
    'Generating Scene':'Δημιουργία σκηνής','Updating thoughts':'Ενημέρωση σκέψεων','Analyzing context':'Ανάλυση πλαισίου',
    // Diff viewer
    'Payload Inspector':'Επιθεωρητής δεδομένων','Changes Only':'Μόνο αλλαγές','Full Diff':'Πλήρης σύγκριση',
    'Side by Side':'Δίπλα-δίπλα','Delta Payload':'Δέλτα','Previous':'Προηγούμενο','Current':'Τρέχον','Full Payload':'Πλήρη δεδομένα',
    // Toasts
    'Completed':'Ολοκληρώθηκε','Removed':'Αφαιρέθηκε','Added':'Προστέθηκε','Regenerated':'Ανανεώθηκε','Regeneration failed':'Η ανανέωση απέτυχε',
    'Remove Quest':'Αφαίρεση αποστολής','Copied!':'Αντιγράφηκε!',
    // Settings
    'General':'Γενικά','Enable ScenePulse':'Ενεργοποίηση ScenePulse','Auto-generate on AI messages':'Αυτόματη δημιουργία σε μηνύματα AI',
    'Show thought bubbles':'Εμφάνιση φυσαλίδων σκέψης','Weather overlay effects':'Εφέ καιρού','Time-of-day ambience':'Ατμόσφαιρα ώρας',
    'Font scale':'Κλίμακα γραμματοσειράς','Language':'Γλώσσα','Auto-detect':'Αυτόματος εντοπισμός',
    'Show developer tools':'Εργαλεία ανάπτυξης',
    // Field labels — scene
    'Topic':'Θέμα','Mood':'Διάθεση','Interaction':'Αλληλεπίδραση','Tension':'Ένταση',
    'Summary':'Περίληψη','Sounds':'Ήχοι','Present':'Παρόντες',
    // Field labels — character appearance
    'Hair':'Μαλλιά','Face':'Πρόσωπο','Outfit':'Ντύσιμο','Dress':'Ένδυση','Posture':'Στάση',
    'Proximity':'Εγγύτητα','Physical':'Σωματική κατάσταση','Inventory':'Αποθήκη',
    // Field labels — goals
    'Need':'Ανάγκη','Short-Term':'Βραχυπρόθ.','Long-Term':'Μακροπρόθ.',
    // Field labels — relationship meta
    'Time Known':'Χρόνος γνωριμίας','Milestone':'Ορόσημο',
    // Field labels — meters
    'Affection':'Στοργή','Trust':'Εμπιστοσύνη','Desire':'Επιθυμία','Stress':'Άγχος','Compat':'Συμβατ.',
    // Field labels — fertility
    'Status':'Κατάσταση','Reason':'Λόγος','Cycle Phase':'Φάση κύκλου','Cycle Day':'Ημέρα κύκλου',
    'Window':'Παράθυρο','Pregnancy':'Εγκυμοσύνη','Preg. Week':'Εβδ. εγκυμ.','Notes':'Σημειώσεις',
    'Fertility: N/A':'Γονιμότητα: Δ/Ε',
    // Stats footer
    'Together':'Μαζί','Separate':'Χωριστά','Inspect':'Επιθεώρηση',
    'Auto':'Αυτόματο','Backup':'Αντίγραφο','Fallback':'Εναλλακτικό','Full regen':'Πλήρης ανανέωση','Settings':'Ρυθμίσεις',
    'Msg regen':'Ανανέωση μηνύμ.','Thoughts':'Σκέψεις',
    'Message index':'Δείκτης μηνύματος','Estimated tokens':'Εκτιμώμενα token','Generation time':'Χρόνος δημιουργίας',
    // Panel Manager
    'Enable All':'Ενεργοποίηση όλων','Disable All':'Απενεργοποίηση όλων','Custom Panels':'Προσαρμοσμένα πάνελ',
    '+ Add Custom Panel':'+ Προσθήκη πάνελ',
    'Expand/Collapse sections':'Ανάπτυξη/Σύμπτυξη ενοτήτων','Condense view':'Συμπαγής προβολή',
    // Edit mode
    'Click any highlighted field to edit':'Κάντε κλικ σε επισημασμένο πεδίο για επεξεργασία',
    'Edit Mode On':'Επεξεργασία ενεργή','Edit Mode Off':'Επεξεργασία ανενεργή',
    // Mobile
    'Scene updated':'Σκηνή ενημερώθηκε','Open ScenePulse':'Άνοιγμα ScenePulse',
    // Loading
    'Updating scene data':'Ενημέρωση δεδομένων σκηνής','Reading context and analyzing characters':'Ανάγνωση πλαισίου και ανάλυση χαρακτήρων',
    // Settings sections/labels
    'Setup Guide':'Οδηγός εγκατάστασης','Guided Tour':'Ξενάγηση','Context msgs':'Μηνύματα πλαισίου',
    'Max retries':'Μέγ. προσπάθειες','Delta mode':'Λειτουργία δέλτα','Injection Method':'Μέθοδος έγχυσης',
    'Mode':'Λειτουργία','Fallback Recovery':'Εναλλακτική ανάκτηση',
    'Enable automatic fallback':'Αυτόματη εναλλακτική','Fallback Profile':'Εναλλακτικό προφίλ',
    'Fallback Preset':'Εναλλακτικό preset','Refresh Profiles':'Ανανέωση προφίλ',
    'Connection Profile':'Προφίλ σύνδεσης','Chat Completion Preset':'Preset ολοκλήρωσης συνομιλίας',
    'Prompt Mode':'Λειτουργία prompt','Context Embedding':'Ενσωμάτωση πλαισίου',
    'Embed snapshots':'Ενσωμάτωση στιγμιοτύπων','Embed as role':'Ενσωμάτωση ως ρόλος',
    'System':'Σύστημα','User':'Χρήστης','Assistant':'Βοηθός',
    'Lorebooks':'Βιβλία γνώσεων','Filter Mode':'Λειτουργία φίλτρου','Refresh Lorebooks':'Ανανέωση βιβλίων γνώσεων',
    'System Prompt':'Prompt συστήματος','JSON Schema':'JSON Σχήμα','Reset to Default':'Επαναφορά προεπιλογής',
    'Actions':'Ενέργειες','Generate':'Δημιουργία','Clear Data':'Εκκαθάριση δεδομένων','Reset Settings':'Επαναφορά ρυθμίσεων',
    'Debug':'Αποσφαλμάτωση','SP Log':'Αρχείο SP','View Log':'Προβολή αρχείου','Console':'Κονσόλα',
    'Last Response':'Τελευταία απάντηση','Active':'Ενεργό','Off':'Ανενεργό',
    // Toast messages
    'Profiles refreshed':'Προφίλ ανανεώθηκαν','Fallback profiles refreshed':'Εναλλακτικά προφίλ ανανεώθηκαν',
    'Lorebooks refreshed':'Βιβλία γνώσεων ανανεώθηκαν','System prompt reset to default':'Prompt συστήματος επαναφέρθηκε',
    'Prompt copied':'Prompt αντιγράφηκε','Schema reset to default':'Σχήμα επαναφέρθηκε',
    'Schema copied':'Σχήμα αντιγράφηκε','Done':'Έγινε','Failed':'Απέτυχε',
    'Data cleared':'Δεδομένα εκκαθαρίστηκαν','Cleared':'Εκκαθαρίστηκε','Settings reset to defaults':'Ρυθμίσεις επαναφέρθηκαν',
    'SP Log copied':'Αρχείο SP αντιγράφηκε','Console copied':'Κονσόλα αντιγράφηκε',
    'Copy failed':'Η αντιγραφή απέτυχε','No API response captured yet':'Δεν καταγράφηκε απάντηση API',
    'Last response copied':'Τελευταία απάντηση αντιγράφηκε','Debug log copied':'Αρχείο αποσφαλμάτωσης αντιγράφηκε',
    'Invalid JSON':'Μη έγκυρο JSON',
    // Story ideas
    'Story direction sent':'Κατεύθυνση ιστορίας στάλθηκε','Story idea copied':'Ιδέα ιστορίας αντιγράφηκε',
    // Custom panels
    'Panel name':'Όνομα πάνελ','Key':'Κλειδί','Label':'Ετικέτα','Type':'Τύπος','LLM Hint':'Υπόδειξη LLM',
    'Add Field':'Προσθήκη πεδίου','Delete panel':'Διαγραφή πάνελ','Remove this field':'Αφαίρεση πεδίου',
    'Drag to reorder':'Σύρετε για αναδιάταξη','No custom panels yet':'Χωρίς προσαρμοσμένα πάνελ',
    // Quest dialog
    'Quest name':'Όνομα αποστολής','1-2 sentences from your perspective':'1-2 προτάσεις από τη δική σας οπτική',
},
'Hungarian': {
    // Section headers
    'Scene Details':'Jelenet részletei','Quest Journal':'Küldetésnapló','Relationships':'Kapcsolatok',
    'Characters':'Karakterek','Story Ideas':'Történetötletek','Inner Thoughts':'Belső gondolatok',
    'North Star':'Sarkcsillag','Main Quests':'Fő küldetések','Side Quests':'Mellék küldetések',
    'Active Tasks':'Aktív feladatok',
    // Badges
    'new':'új','updated':'frissítve','resolved':'teljesítve',
    // Buttons & actions
    'Add quest':'Küldetés hozzáadása','Cancel':'Mégse','Add Quest':'Hozzáadás','Regenerate all':'Összes újragenerálása',
    'Mark as completed':'Befejezettnek jelölés','Remove quest':'Küldetés eltávolítása','Restore quest':'Küldetés visszaállítása',
    'Stop Generation':'■ Megállítás','Jump to latest':'Legújabbra ugrás','Copy':'Másolás',
    // Empty states
    'No scene data yet':'Nincs jelenetadat','Send a message or click ⟳ to generate.':'Küldjön üzenetet vagy kattintson ⟳.',
    'No active storyline quests':'Nincs aktív történet-küldetés','No side quests discovered':'Nincs mellék küldetés',
    'No immediate tasks':'Nincs sürgős feladat','Not yet revealed':'Még nem derült ki',
    // Form labels
    'Name':'Név','Urgency':'Sürgősség','Details':'Részletek','Critical':'Kritikus','High':'Magas','Moderate':'Közepes','Low':'Alacsony',
    // Tooltips
    'Toggle edit mode':'Szerkesztési mód','Show empty fields':'Üres mezők mutatása',
    'Snap to left of chat':'Rögzítés balra','Ghost mode':'Szellem mód','Regenerate thoughts':'Gondolatok újragenerálása',
    'Hide thoughts':'Gondolatok elrejtése','Hide panel':'Panel elrejtése','Panel Manager':'Panelkezelő',
    // Loading
    'Generating Scene':'Jelenet generálása','Updating thoughts':'Gondolatok frissítése','Analyzing context':'Kontextus elemzése',
    // Diff viewer
    'Payload Inspector':'Adat-ellenőrző','Changes Only':'Csak változások','Full Diff':'Teljes összehasonlítás',
    'Side by Side':'Egymás mellett','Delta Payload':'Delta','Previous':'Előző','Current':'Jelenlegi','Full Payload':'Teljes adat',
    // Toasts
    'Completed':'Befejezve','Removed':'Eltávolítva','Added':'Hozzáadva','Regenerated':'Újragenerálva','Regeneration failed':'Újragenerálás sikertelen',
    'Remove Quest':'Küldetés eltávolítása','Copied!':'Másolva!',
    // Settings
    'General':'Általános','Enable ScenePulse':'ScenePulse bekapcsolása','Auto-generate on AI messages':'Automatikus generálás AI üzeneteknél',
    'Show thought bubbles':'Gondolatbuborékok mutatása','Weather overlay effects':'Időjárási effektek','Time-of-day ambience':'Napszak hangulata',
    'Font scale':'Betűméret arány','Language':'Nyelv','Auto-detect':'Automatikus felismerés',
    'Show developer tools':'Fejlesztői eszközök',
    // Field labels — scene
    'Topic':'Téma','Mood':'Hangulat','Interaction':'Interakció','Tension':'Feszültség',
    'Summary':'Összefoglalás','Sounds':'Hangok','Present':'Jelenlévők',
    // Field labels — character appearance
    'Hair':'Haj','Face':'Arc','Outfit':'Öltözet','Dress':'Ruházat','Posture':'Testtartás',
    'Proximity':'Közelség','Physical':'Fizikai állapot','Inventory':'Felszerelés',
    // Field labels — goals
    'Need':'Szükséglet','Short-Term':'Rövid távú','Long-Term':'Hosszú távú',
    // Field labels — relationship meta
    'Time Known':'Ismeretség ideje','Milestone':'Mérföldkő',
    // Field labels — meters
    'Affection':'Vonzalom','Trust':'Bizalom','Desire':'Vágy','Stress':'Stressz','Compat':'Kompatib.',
    // Field labels — fertility
    'Status':'Állapot','Reason':'Ok','Cycle Phase':'Ciklus fázisa','Cycle Day':'Ciklus napja',
    'Window':'Ablak','Pregnancy':'Terhesség','Preg. Week':'Terh. hét','Notes':'Megjegyzések',
    'Fertility: N/A':'Termékenység: N/A',
    // Stats footer
    'Together':'Együtt','Separate':'Külön','Inspect':'Vizsgálat',
    'Auto':'Automatikus','Backup':'Biztonsági másolat','Fallback':'Tartalék','Full regen':'Teljes újregen.','Settings':'Beállítások',
    'Msg regen':'Üzenet újregen.','Thoughts':'Gondolatok',
    'Message index':'Üzenet index','Estimated tokens':'Becsült tokenek','Generation time':'Generálási idő',
    // Panel Manager
    'Enable All':'Összes bekapcsolása','Disable All':'Összes kikapcsolása','Custom Panels':'Egyéni panelek',
    '+ Add Custom Panel':'+ Egyéni panel hozzáadása',
    'Expand/Collapse sections':'Szekciók kibontása/összecsukása','Condense view':'Tömör nézet',
    // Edit mode
    'Click any highlighted field to edit':'Kattintson egy kiemelt mezőre a szerkesztéshez',
    'Edit Mode On':'Szerkesztési mód be','Edit Mode Off':'Szerkesztési mód ki',
    // Mobile
    'Scene updated':'Jelenet frissítve','Open ScenePulse':'ScenePulse megnyitása',
    // Loading
    'Updating scene data':'Jelenetadatok frissítése','Reading context and analyzing characters':'Kontextus olvasása és karakterek elemzése',
    // Settings sections/labels
    'Setup Guide':'Beállítási útmutató','Guided Tour':'Vezetett túra','Context msgs':'Kontextus üzenetek',
    'Max retries':'Max. próbálkozás','Delta mode':'Delta mód','Injection Method':'Injekciós módszer',
    'Mode':'Mód','Fallback Recovery':'Tartalék helyreállítás',
    'Enable automatic fallback':'Automatikus tartalék bekapcsolása','Fallback Profile':'Tartalék profil',
    'Fallback Preset':'Tartalék előbeállítás','Refresh Profiles':'Profilok frissítése',
    'Connection Profile':'Kapcsolati profil','Chat Completion Preset':'Csevegés-kiegészítés előbeállítás',
    'Prompt Mode':'Prompt mód','Context Embedding':'Kontextus beágyazás',
    'Embed snapshots':'Pillanatképek beágyazása','Embed as role':'Beágyazás szerepként',
    'System':'Rendszer','User':'Felhasználó','Assistant':'Asszisztens',
    'Lorebooks':'Tudáskönyvek','Filter Mode':'Szűrő mód','Refresh Lorebooks':'Tudáskönyvek frissítése',
    'System Prompt':'Rendszer prompt','JSON Schema':'JSON séma','Reset to Default':'Alapértelmezettre visszaállítás',
    'Actions':'Műveletek','Generate':'Generálás','Clear Data':'Adatok törlése','Reset Settings':'Beállítások visszaállítása',
    'Debug':'Hibakeresés','SP Log':'SP napló','View Log':'Napló megtekintése','Console':'Konzol',
    'Last Response':'Utolsó válasz','Active':'Aktív','Off':'Ki',
    // Toast messages
    'Profiles refreshed':'Profilok frissítve','Fallback profiles refreshed':'Tartalék profilok frissítve',
    'Lorebooks refreshed':'Tudáskönyvek frissítve','System prompt reset to default':'Rendszer prompt visszaállítva',
    'Prompt copied':'Prompt másolva','Schema reset to default':'Séma visszaállítva',
    'Schema copied':'Séma másolva','Done':'Kész','Failed':'Sikertelen',
    'Data cleared':'Adatok törölve','Cleared':'Törölve','Settings reset to defaults':'Beállítások visszaállítva',
    'SP Log copied':'SP napló másolva','Console copied':'Konzol másolva',
    'Copy failed':'Másolás sikertelen','No API response captured yet':'Nincs rögzített API válasz',
    'Last response copied':'Utolsó válasz másolva','Debug log copied':'Hibakeresési napló másolva',
    'Invalid JSON':'Érvénytelen JSON',
    // Story ideas
    'Story direction sent':'Történet iránya elküldve','Story idea copied':'Történetötlet másolva',
    // Custom panels
    'Panel name':'Panel neve','Key':'Kulcs','Label':'Címke','Type':'Típus','LLM Hint':'LLM tipp',
    'Add Field':'Mező hozzáadása','Delete panel':'Panel törlése','Remove this field':'Mező eltávolítása',
    'Drag to reorder':'Húzza az átrendezéshez','No custom panels yet':'Nincs egyéni panel',
    // Quest dialog
    'Quest name':'Küldetés neve','1-2 sentences from your perspective':'1-2 mondat az Ön szemszögéből',
},
'Swedish': {
    // Section headers
    'Scene Details':'Scendetaljer','Quest Journal':'Uppdragsjournal','Relationships':'Relationer',
    'Characters':'Karaktärer','Story Ideas':'Berättelseidéer','Inner Thoughts':'Inre tankar',
    'North Star':'Polstjärnan','Main Quests':'Huvuduppdrag','Side Quests':'Sidouppdrag',
    'Active Tasks':'Aktiva uppgifter',
    // Badges
    'new':'ny','updated':'uppdaterad','resolved':'avklarad',
    // Buttons & actions
    'Add quest':'Lägg till uppdrag','Cancel':'Avbryt','Add Quest':'Lägg till','Regenerate all':'Regenerera allt',
    'Mark as completed':'Markera som klar','Remove quest':'Ta bort uppdrag','Restore quest':'Återställ uppdrag',
    'Stop Generation':'■ Stoppa','Jump to latest':'Till senaste','Copy':'Kopiera',
    // Empty states
    'No scene data yet':'Inga scendata än','Send a message or click ⟳ to generate.':'Skicka meddelande eller klicka ⟳.',
    'No active storyline quests':'Inga aktiva berättelseuppdrag','No side quests discovered':'Inga sidouppdrag hittade',
    'No immediate tasks':'Inga brådskande uppgifter','Not yet revealed':'Inte avslöjat ännu',
    // Form labels
    'Name':'Namn','Urgency':'Brådska','Details':'Detaljer','Critical':'Kritisk','High':'Hög','Moderate':'Medel','Low':'Låg',
    // Tooltips
    'Toggle edit mode':'Växla redigeringsläge','Show empty fields':'Visa tomma fält',
    'Snap to left of chat':'Fäst till vänster','Ghost mode':'Spökläge','Regenerate thoughts':'Regenerera tankar',
    'Hide thoughts':'Dölj tankar','Hide panel':'Dölj panel','Panel Manager':'Panelhanterare',
    // Loading
    'Generating Scene':'Genererar scen','Updating thoughts':'Uppdaterar tankar','Analyzing context':'Analyserar kontext',
    // Diff viewer
    'Payload Inspector':'Datainspektör','Changes Only':'Bara ändringar','Full Diff':'Fullständig jämförelse',
    'Side by Side':'Sida vid sida','Delta Payload':'Delta','Previous':'Föregående','Current':'Aktuell','Full Payload':'Fullständig data',
    // Toasts
    'Completed':'Klar','Removed':'Borttagen','Added':'Tillagd','Regenerated':'Regenererad','Regeneration failed':'Regenerering misslyckades',
    'Remove Quest':'Ta bort uppdrag','Copied!':'Kopierat!',
    // Settings
    'General':'Allmänt','Enable ScenePulse':'Aktivera ScenePulse','Auto-generate on AI messages':'Autogenerera vid AI-meddelanden',
    'Show thought bubbles':'Visa tankebubblor','Weather overlay effects':'Vädereffekter','Time-of-day ambience':'Tidsmiljö',
    'Font scale':'Typsnittsskala','Language':'Språk','Auto-detect':'Automatisk identifiering',
    'Show developer tools':'Utvecklarverktyg',
    // Field labels — scene
    'Topic':'Ämne','Mood':'Stämning','Interaction':'Interaktion','Tension':'Spänning',
    'Summary':'Sammanfattning','Sounds':'Ljud','Present':'Närvarande',
    // Field labels — character appearance
    'Hair':'Hår','Face':'Ansikte','Outfit':'Kläder','Dress':'Klädsel','Posture':'Hållning',
    'Proximity':'Närhet','Physical':'Fysiskt','Inventory':'Inventarie',
    // Field labels — goals
    'Need':'Behov','Short-Term':'Kortsiktigt','Long-Term':'Långsiktigt',
    // Field labels — relationship meta
    'Time Known':'Känd sedan','Milestone':'Milstolpe',
    // Field labels — meters
    'Affection':'Tillgivenhet','Trust':'Tillit','Desire':'Begär','Stress':'Stress','Compat':'Kompat.',
    // Field labels — fertility
    'Status':'Status','Reason':'Orsak','Cycle Phase':'Cykelfas','Cycle Day':'Cykeldag',
    'Window':'Fönster','Pregnancy':'Graviditet','Preg. Week':'Grav. vecka','Notes':'Anteckningar',
    'Fertility: N/A':'Fertilitet: Ej tillämpligt',
    // Stats footer
    'Together':'Tillsammans','Separate':'Separat','Inspect':'Inspektera',
    'Auto':'Auto','Backup':'Säkerhetskopia','Fallback':'Reserv','Full regen':'Fullständig regen.','Settings':'Inställningar',
    'Msg regen':'Meddel. regen.','Thoughts':'Tankar',
    'Message index':'Meddelandeindex','Estimated tokens':'Uppskattade tokens','Generation time':'Genereringstid',
    // Panel Manager
    'Enable All':'Aktivera alla','Disable All':'Inaktivera alla','Custom Panels':'Anpassade paneler',
    '+ Add Custom Panel':'+ Lägg till anpassad panel',
    'Expand/Collapse sections':'Expandera/Kollapsa sektioner','Condense view':'Kompakt vy',
    // Edit mode
    'Click any highlighted field to edit':'Klicka på ett markerat fält för att redigera',
    'Edit Mode On':'Redigeringsläge på','Edit Mode Off':'Redigeringsläge av',
    // Mobile
    'Scene updated':'Scen uppdaterad','Open ScenePulse':'Öppna ScenePulse',
    // Loading
    'Updating scene data':'Uppdaterar scendata','Reading context and analyzing characters':'Läser kontext och analyserar karaktärer',
    // Settings sections/labels
    'Setup Guide':'Installationsguide','Guided Tour':'Guidad tur','Context msgs':'Kontextmeddelanden',
    'Max retries':'Max. försök','Delta mode':'Deltaläge','Injection Method':'Injektionsmetod',
    'Mode':'Läge','Fallback Recovery':'Reservåterhämtning',
    'Enable automatic fallback':'Automatisk reserv','Fallback Profile':'Reservprofil',
    'Fallback Preset':'Reservpreset','Refresh Profiles':'Uppdatera profiler',
    'Connection Profile':'Anslutningsprofil','Chat Completion Preset':'Chattkompletteringspresets',
    'Prompt Mode':'Promptläge','Context Embedding':'Kontextinbäddning',
    'Embed snapshots':'Bädda in ögonblicksbilder','Embed as role':'Bädda in som roll',
    'System':'System','User':'Användare','Assistant':'Assistent',
    'Lorebooks':'Lorebooks','Filter Mode':'Filterläge','Refresh Lorebooks':'Uppdatera lorebooks',
    'System Prompt':'Systemprompt','JSON Schema':'JSON-schema','Reset to Default':'Återställ standardvärden',
    'Actions':'Åtgärder','Generate':'Generera','Clear Data':'Rensa data','Reset Settings':'Återställ inställningar',
    'Debug':'Felsökning','SP Log':'SP-logg','View Log':'Visa logg','Console':'Konsol',
    'Last Response':'Senaste svar','Active':'Aktiv','Off':'Av',
    // Toast messages
    'Profiles refreshed':'Profiler uppdaterade','Fallback profiles refreshed':'Reservprofiler uppdaterade',
    'Lorebooks refreshed':'Lorebooks uppdaterade','System prompt reset to default':'Systemprompt återställd',
    'Prompt copied':'Prompt kopierad','Schema reset to default':'Schema återställt',
    'Schema copied':'Schema kopierat','Done':'Klart','Failed':'Misslyckades',
    'Data cleared':'Data rensad','Cleared':'Rensat','Settings reset to defaults':'Inställningar återställda',
    'SP Log copied':'SP-logg kopierad','Console copied':'Konsol kopierad',
    'Copy failed':'Kopiering misslyckades','No API response captured yet':'Inget API-svar fångat ännu',
    'Last response copied':'Senaste svar kopierat','Debug log copied':'Felsökningslogg kopierad',
    'Invalid JSON':'Ogiltig JSON',
    // Story ideas
    'Story direction sent':'Berättelseriktning skickad','Story idea copied':'Berättelseidé kopierad',
    // Custom panels
    'Panel name':'Panelnamn','Key':'Nyckel','Label':'Etikett','Type':'Typ','LLM Hint':'LLM-tips',
    'Add Field':'Lägg till fält','Delete panel':'Ta bort panel','Remove this field':'Ta bort detta fält',
    'Drag to reorder':'Dra för att ordna om','No custom panels yet':'Inga anpassade paneler ännu',
    // Quest dialog
    'Quest name':'Uppdragsnamn','1-2 sentences from your perspective':'1-2 meningar ur ditt perspektiv',
},
'Malay': {
    // Section headers
    'Scene Details':'Butiran Adegan','Quest Journal':'Jurnal Misi','Relationships':'Hubungan',
    'Characters':'Watak','Story Ideas':'Idea Cerita','Inner Thoughts':'Fikiran Dalaman',
    'North Star':'Bintang Utara','Main Quests':'Misi Utama','Side Quests':'Misi Sampingan',
    'Active Tasks':'Tugas Aktif',
    // Badges
    'new':'baharu','updated':'dikemas kini','resolved':'selesai',
    // Buttons & actions
    'Add quest':'Tambah misi','Cancel':'Batal','Add Quest':'Tambah','Regenerate all':'Jana semula semua',
    'Mark as completed':'Tandakan selesai','Remove quest':'Padam misi','Restore quest':'Pulihkan misi',
    'Stop Generation':'■ Hentikan','Jump to latest':'Ke terkini','Copy':'Salin',
    // Empty states
    'No scene data yet':'Tiada data adegan lagi','Send a message or click ⟳ to generate.':'Hantar mesej atau klik ⟳ untuk menjana.',
    'No active storyline quests':'Tiada misi cerita aktif','No side quests discovered':'Tiada misi sampingan dijumpai',
    'No immediate tasks':'Tiada tugas segera','Not yet revealed':'Belum didedahkan',
    // Form labels
    'Name':'Nama','Urgency':'Keutamaan','Details':'Butiran','Critical':'Kritikal','High':'Tinggi','Moderate':'Sederhana','Low':'Rendah',
    // Tooltips
    'Toggle edit mode':'Togol mod sunting','Show empty fields':'Papar medan kosong',
    'Snap to left of chat':'Lekatkan di kiri sembang','Ghost mode':'Mod hantu','Regenerate thoughts':'Jana semula fikiran',
    'Hide thoughts':'Sembunyikan fikiran','Hide panel':'Sembunyikan panel','Panel Manager':'Pengurus Panel',
    // Loading
    'Generating Scene':'Menjana adegan','Updating thoughts':'Mengemas kini fikiran','Analyzing context':'Menganalisis konteks',
    // Diff viewer
    'Payload Inspector':'Pemeriksa Data','Changes Only':'Perubahan sahaja','Full Diff':'Perbandingan penuh',
    'Side by Side':'Sebelah-menyebelah','Delta Payload':'Delta','Previous':'Sebelumnya','Current':'Semasa','Full Payload':'Data penuh',
    // Toasts
    'Completed':'Selesai','Removed':'Dipadam','Added':'Ditambah','Regenerated':'Dijana semula','Regeneration failed':'Penjanaan semula gagal',
    'Remove Quest':'Padam misi','Copied!':'Disalin!',
    // Settings
    'General':'Umum','Enable ScenePulse':'Aktifkan ScenePulse','Auto-generate on AI messages':'Jana automatik pada mesej AI',
    'Show thought bubbles':'Papar gelembung fikiran','Weather overlay effects':'Kesan cuaca','Time-of-day ambience':'Suasana waktu',
    'Font scale':'Skala fon','Language':'Bahasa','Auto-detect':'Kesan automatik',
    'Show developer tools':'Alat pembangun',
    // Field labels — scene
    'Topic':'Topik','Mood':'Mood','Interaction':'Interaksi','Tension':'Ketegangan',
    'Summary':'Ringkasan','Sounds':'Bunyi','Present':'Hadir',
    // Field labels — character appearance
    'Hair':'Rambut','Face':'Wajah','Outfit':'Pakaian','Dress':'Busana','Posture':'Postur',
    'Proximity':'Kedekatan','Physical':'Fizikal','Inventory':'Inventori',
    // Field labels — goals
    'Need':'Keperluan','Short-Term':'Jangka pendek','Long-Term':'Jangka panjang',
    // Field labels — relationship meta
    'Time Known':'Tempoh kenalan','Milestone':'Pencapaian',
    // Field labels — meters
    'Affection':'Kasih sayang','Trust':'Kepercayaan','Desire':'Keinginan','Stress':'Tekanan','Compat':'Keserasian',
    // Field labels — fertility
    'Status':'Status','Reason':'Sebab','Cycle Phase':'Fasa kitaran','Cycle Day':'Hari kitaran',
    'Window':'Tetingkap','Pregnancy':'Kehamilan','Preg. Week':'Minggu hamil','Notes':'Nota',
    'Fertility: N/A':'Kesuburan: Tidak berkenaan',
    // Stats footer
    'Together':'Bersama','Separate':'Berasingan','Inspect':'Periksa',
    'Auto':'Auto','Backup':'Sandaran','Fallback':'Cadangan','Full regen':'Regen penuh','Settings':'Tetapan',
    'Msg regen':'Regen mesej','Thoughts':'Fikiran',
    'Message index':'Indeks mesej','Estimated tokens':'Token anggaran','Generation time':'Masa penjanaan',
    // Panel Manager
    'Enable All':'Aktifkan semua','Disable All':'Nyahaktifkan semua','Custom Panels':'Panel Tersuai',
    '+ Add Custom Panel':'+ Tambah Panel Tersuai',
    'Expand/Collapse sections':'Kembang/Kuncup seksyen','Condense view':'Paparan ringkas',
    // Edit mode
    'Click any highlighted field to edit':'Klik medan yang diserlahkan untuk menyunting',
    'Edit Mode On':'Mod sunting hidup','Edit Mode Off':'Mod sunting mati',
    // Mobile
    'Scene updated':'Adegan dikemas kini','Open ScenePulse':'Buka ScenePulse',
    // Loading
    'Updating scene data':'Mengemas kini data adegan','Reading context and analyzing characters':'Membaca konteks dan menganalisis watak',
    // Settings sections/labels
    'Setup Guide':'Panduan Persediaan','Guided Tour':'Lawatan Berpandu','Context msgs':'Mesej konteks',
    'Max retries':'Maks. cubaan','Delta mode':'Mod delta','Injection Method':'Kaedah suntikan',
    'Mode':'Mod','Fallback Recovery':'Pemulihan cadangan',
    'Enable automatic fallback':'Aktifkan cadangan automatik','Fallback Profile':'Profil cadangan',
    'Fallback Preset':'Pratetap cadangan','Refresh Profiles':'Segar semula profil',
    'Connection Profile':'Profil sambungan','Chat Completion Preset':'Pratetap penyelesaian sembang',
    'Prompt Mode':'Mod prompt','Context Embedding':'Pembenaman konteks',
    'Embed snapshots':'Benamkan petikan','Embed as role':'Benamkan sebagai peranan',
    'System':'Sistem','User':'Pengguna','Assistant':'Pembantu',
    'Lorebooks':'Buku ilmu','Filter Mode':'Mod tapis','Refresh Lorebooks':'Segar semula buku ilmu',
    'System Prompt':'Prompt sistem','JSON Schema':'Skema JSON','Reset to Default':'Set semula lalai',
    'Actions':'Tindakan','Generate':'Jana','Clear Data':'Padam data','Reset Settings':'Set semula tetapan',
    'Debug':'Nyahpepijat','SP Log':'Log SP','View Log':'Lihat log','Console':'Konsol',
    'Last Response':'Respons terakhir','Active':'Aktif','Off':'Mati',
    // Toast messages
    'Profiles refreshed':'Profil disegar semula','Fallback profiles refreshed':'Profil cadangan disegar semula',
    'Lorebooks refreshed':'Buku ilmu disegar semula','System prompt reset to default':'Prompt sistem diset semula',
    'Prompt copied':'Prompt disalin','Schema reset to default':'Skema diset semula',
    'Schema copied':'Skema disalin','Done':'Selesai','Failed':'Gagal',
    'Data cleared':'Data dipadam','Cleared':'Dipadam','Settings reset to defaults':'Tetapan diset semula',
    'SP Log copied':'Log SP disalin','Console copied':'Konsol disalin',
    'Copy failed':'Salinan gagal','No API response captured yet':'Tiada respons API ditangkap',
    'Last response copied':'Respons terakhir disalin','Debug log copied':'Log nyahpepijat disalin',
    'Invalid JSON':'JSON tidak sah',
    // Story ideas
    'Story direction sent':'Hala tuju cerita dihantar','Story idea copied':'Idea cerita disalin',
    // Custom panels
    'Panel name':'Nama panel','Key':'Kunci','Label':'Label','Type':'Jenis','LLM Hint':'Petunjuk LLM',
    'Add Field':'Tambah medan','Delete panel':'Padam panel','Remove this field':'Buang medan ini',
    'Drag to reorder':'Seret untuk susun semula','No custom panels yet':'Tiada panel tersuai lagi',
    // Quest dialog
    'Quest name':'Nama misi','1-2 sentences from your perspective':'1-2 ayat dari perspektif anda',
},
'Finnish': {
    // Section headers
    'Scene Details':'Kohtauksen tiedot','Quest Journal':'Tehtäväpäiväkirja','Relationships':'Suhteet',
    'Characters':'Hahmot','Story Ideas':'Tarinaideat','Inner Thoughts':'Sisäiset ajatukset',
    'North Star':'Pohjantähti','Main Quests':'Päätehtävät','Side Quests':'Sivutehtävät',
    'Active Tasks':'Aktiiviset tehtävät',
    // Badges
    'new':'uusi','updated':'päivitetty','resolved':'valmis',
    // Buttons & actions
    'Add quest':'Lisää tehtävä','Cancel':'Peruuta','Add Quest':'Lisää','Regenerate all':'Luo kaikki uudelleen',
    'Mark as completed':'Merkitse valmiiksi','Remove quest':'Poista tehtävä','Restore quest':'Palauta tehtävä',
    'Stop Generation':'■ Pysäytä','Jump to latest':'Uusimpaan','Copy':'Kopioi',
    // Empty states
    'No scene data yet':'Ei kohtaustietoja vielä','Send a message or click ⟳ to generate.':'Lähetä viesti tai klikkaa ⟳.',
    'No active storyline quests':'Ei aktiivisia tarinatehtäviä','No side quests discovered':'Ei sivutehtäviä löydetty',
    'No immediate tasks':'Ei kiireellisiä tehtäviä','Not yet revealed':'Ei vielä paljastettu',
    // Form labels
    'Name':'Nimi','Urgency':'Kiireellisyys','Details':'Yksityiskohdat','Critical':'Kriittinen','High':'Korkea','Moderate':'Keskitaso','Low':'Matala',
    // Tooltips
    'Toggle edit mode':'Vaihda muokkaustilaan','Show empty fields':'Näytä tyhjät kentät',
    'Snap to left of chat':'Kiinnitä vasemmalle','Ghost mode':'Haamutila','Regenerate thoughts':'Luo ajatukset uudelleen',
    'Hide thoughts':'Piilota ajatukset','Hide panel':'Piilota paneeli','Panel Manager':'Paneelien hallinta',
    // Loading
    'Generating Scene':'Luodaan kohtausta','Updating thoughts':'Päivitetään ajatuksia','Analyzing context':'Analysoidaan kontekstia',
    // Diff viewer
    'Payload Inspector':'Tietotarkistaja','Changes Only':'Vain muutokset','Full Diff':'Täysi vertailu',
    'Side by Side':'Vierekkäin','Delta Payload':'Delta','Previous':'Edellinen','Current':'Nykyinen','Full Payload':'Kaikki tiedot',
    // Toasts
    'Completed':'Valmis','Removed':'Poistettu','Added':'Lisätty','Regenerated':'Luotu uudelleen','Regeneration failed':'Uudelleenluonti epäonnistui',
    'Remove Quest':'Poista tehtävä','Copied!':'Kopioitu!',
    // Settings
    'General':'Yleiset','Enable ScenePulse':'Ota ScenePulse käyttöön','Auto-generate on AI messages':'Automaattinen luonti AI-viesteillä',
    'Show thought bubbles':'Näytä ajatuskuplat','Weather overlay effects':'Sääefektit','Time-of-day ambience':'Vuorokaudenajan tunnelma',
    'Font scale':'Fonttikoko','Language':'Kieli','Auto-detect':'Automaattinen tunnistus',
    'Show developer tools':'Kehittäjätyökalut',
    // Field labels — scene
    'Topic':'Aihe','Mood':'Tunnelma','Interaction':'Vuorovaikutus','Tension':'Jännitys',
    'Summary':'Yhteenveto','Sounds':'Äänet','Present':'Paikalla',
    // Field labels — character appearance
    'Hair':'Hiukset','Face':'Kasvot','Outfit':'Asu','Dress':'Vaatetus','Posture':'Ryhti',
    'Proximity':'Läheisyys','Physical':'Fyysinen tila','Inventory':'Varusteet',
    // Field labels — goals
    'Need':'Tarve','Short-Term':'Lyhyt aikaväli','Long-Term':'Pitkä aikaväli',
    // Field labels — relationship meta
    'Time Known':'Tunnettu aika','Milestone':'Virstanpylväs',
    // Field labels — meters
    'Affection':'Kiintymys','Trust':'Luottamus','Desire':'Halu','Stress':'Stressi','Compat':'Yhteens.',
    // Field labels — fertility
    'Status':'Tila','Reason':'Syy','Cycle Phase':'Syklin vaihe','Cycle Day':'Syklin päivä',
    'Window':'Ikkuna','Pregnancy':'Raskaus','Preg. Week':'Rask. viikko','Notes':'Muistiinpanot',
    'Fertility: N/A':'Hedelmällisyys: Ei sovellettavissa',
    // Stats footer
    'Together':'Yhdessä','Separate':'Erikseen','Inspect':'Tarkasta',
    'Auto':'Automaattinen','Backup':'Varmuuskopio','Fallback':'Vara','Full regen':'Täysi uudelleenluonti','Settings':'Asetukset',
    'Msg regen':'Viestin uudelleenluonti','Thoughts':'Ajatukset',
    'Message index':'Viestin indeksi','Estimated tokens':'Arvioidut tokenit','Generation time':'Luontiaika',
    // Panel Manager
    'Enable All':'Ota kaikki käyttöön','Disable All':'Poista kaikki käytöstä','Custom Panels':'Mukautetut paneelit',
    '+ Add Custom Panel':'+ Lisää mukautettu paneeli',
    'Expand/Collapse sections':'Laajenna/Supista osiot','Condense view':'Tiivis näkymä',
    // Edit mode
    'Click any highlighted field to edit':'Napsauta korostettua kenttää muokataksesi',
    'Edit Mode On':'Muokkaustila päällä','Edit Mode Off':'Muokkaustila pois',
    // Mobile
    'Scene updated':'Kohtaus päivitetty','Open ScenePulse':'Avaa ScenePulse',
    // Loading
    'Updating scene data':'Päivitetään kohtaustietoja','Reading context and analyzing characters':'Luetaan kontekstia ja analysoidaan hahmoja',
    // Settings sections/labels
    'Setup Guide':'Asennusopas','Guided Tour':'Opastettu kierros','Context msgs':'Kontekstiviestit',
    'Max retries':'Max. yritykset','Delta mode':'Delta-tila','Injection Method':'Injektiomenetelmä',
    'Mode':'Tila','Fallback Recovery':'Varapalautus',
    'Enable automatic fallback':'Automaattinen varatila','Fallback Profile':'Varaprofiili',
    'Fallback Preset':'Varaesiasetukset','Refresh Profiles':'Päivitä profiilit',
    'Connection Profile':'Yhteysprofiili','Chat Completion Preset':'Chat-täydennyksen esiasetukset',
    'Prompt Mode':'Prompt-tila','Context Embedding':'Kontekstin upotus',
    'Embed snapshots':'Upota tilannekuvia','Embed as role':'Upota roolina',
    'System':'Järjestelmä','User':'Käyttäjä','Assistant':'Avustaja',
    'Lorebooks':'Tietokirjat','Filter Mode':'Suodatintila','Refresh Lorebooks':'Päivitä tietokirjat',
    'System Prompt':'Järjestelmäprompt','JSON Schema':'JSON-skeema','Reset to Default':'Palauta oletukset',
    'Actions':'Toiminnot','Generate':'Luo','Clear Data':'Tyhjennä tiedot','Reset Settings':'Nollaa asetukset',
    'Debug':'Virheenkorjaus','SP Log':'SP-loki','View Log':'Näytä loki','Console':'Konsoli',
    'Last Response':'Viimeisin vastaus','Active':'Aktiivinen','Off':'Pois',
    // Toast messages
    'Profiles refreshed':'Profiilit päivitetty','Fallback profiles refreshed':'Varaprofiilit päivitetty',
    'Lorebooks refreshed':'Tietokirjat päivitetty','System prompt reset to default':'Järjestelmäprompt nollattu',
    'Prompt copied':'Prompt kopioitu','Schema reset to default':'Skeema nollattu',
    'Schema copied':'Skeema kopioitu','Done':'Valmis','Failed':'Epäonnistui',
    'Data cleared':'Tiedot tyhjennetty','Cleared':'Tyhjennetty','Settings reset to defaults':'Asetukset nollattu',
    'SP Log copied':'SP-loki kopioitu','Console copied':'Konsoli kopioitu',
    'Copy failed':'Kopiointi epäonnistui','No API response captured yet':'API-vastausta ei vielä kaapattu',
    'Last response copied':'Viimeisin vastaus kopioitu','Debug log copied':'Virheenkorjausloki kopioitu',
    'Invalid JSON':'Virheellinen JSON',
    // Story ideas
    'Story direction sent':'Tarinan suunta lähetetty','Story idea copied':'Tarinaidea kopioitu',
    // Custom panels
    'Panel name':'Paneelin nimi','Key':'Avain','Label':'Otsikko','Type':'Tyyppi','LLM Hint':'LLM-vihje',
    'Add Field':'Lisää kenttä','Delete panel':'Poista paneeli','Remove this field':'Poista tämä kenttä',
    'Drag to reorder':'Vedä järjestääksesi','No custom panels yet':'Ei mukautettuja paneeleita',
    // Quest dialog
    'Quest name':'Tehtävän nimi','1-2 sentences from your perspective':'1-2 lausetta omasta näkökulmastasi',
},
'Danish': {
    // Section headers
    'Scene Details':'Scenedetaljer','Quest Journal':'Opgavejournal','Relationships':'Relationer',
    'Characters':'Karakterer','Story Ideas':'Historieidéer','Inner Thoughts':'Indre tanker',
    'North Star':'Nordstjernen','Main Quests':'Hovedopgaver','Side Quests':'Sideopgaver',
    'Active Tasks':'Aktive opgaver',
    // Badges
    'new':'ny','updated':'opdateret','resolved':'løst',
    // Buttons & actions
    'Add quest':'Tilføj opgave','Cancel':'Annuller','Add Quest':'Tilføj','Regenerate all':'Regenerer alt',
    'Mark as completed':'Markér som udført','Remove quest':'Fjern opgave','Restore quest':'Gendan opgave',
    'Stop Generation':'■ Stop','Jump to latest':'Til seneste','Copy':'Kopiér',
    // Empty states
    'No scene data yet':'Ingen scenedata endnu','Send a message or click ⟳ to generate.':'Send en besked eller klik ⟳.',
    'No active storyline quests':'Ingen aktive historieopgaver','No side quests discovered':'Ingen sideopgaver fundet',
    'No immediate tasks':'Ingen presserende opgaver','Not yet revealed':'Ikke afsløret endnu',
    // Form labels
    'Name':'Navn','Urgency':'Hastighed','Details':'Detaljer','Critical':'Kritisk','High':'Høj','Moderate':'Middel','Low':'Lav',
    // Tooltips
    'Toggle edit mode':'Skift redigeringstilstand','Show empty fields':'Vis tomme felter',
    'Snap to left of chat':'Fastgør til venstre','Ghost mode':'Spøgelsestilstand','Regenerate thoughts':'Regenerer tanker',
    'Hide thoughts':'Skjul tanker','Hide panel':'Skjul panel','Panel Manager':'Panelstyring',
    // Loading
    'Generating Scene':'Genererer scene','Updating thoughts':'Opdaterer tanker','Analyzing context':'Analyserer kontekst',
    // Diff viewer
    'Payload Inspector':'Datainspektør','Changes Only':'Kun ændringer','Full Diff':'Fuld sammenligning',
    'Side by Side':'Side om side','Delta Payload':'Delta','Previous':'Forrige','Current':'Nuværende','Full Payload':'Fuld data',
    // Toasts
    'Completed':'Udført','Removed':'Fjernet','Added':'Tilføjet','Regenerated':'Regenereret','Regeneration failed':'Regenerering mislykkedes',
    'Remove Quest':'Fjern opgave','Copied!':'Kopieret!',
    // Settings
    'General':'Generelt','Enable ScenePulse':'Aktivér ScenePulse','Auto-generate on AI messages':'Auto-generer ved AI-beskeder',
    'Show thought bubbles':'Vis tankebobler','Weather overlay effects':'Vejreffekter','Time-of-day ambience':'Tidspunktstemning',
    'Font scale':'Skriftstørrelse','Language':'Sprog','Auto-detect':'Auto-detekter',
    'Show developer tools':'Udviklingsværktøjer',
    // Field labels — scene
    'Topic':'Emne','Mood':'Stemning','Interaction':'Interaktion','Tension':'Spænding',
    'Summary':'Resumé','Sounds':'Lyde','Present':'Til stede',
    // Field labels — character appearance
    'Hair':'Hår','Face':'Ansigt','Outfit':'Tøj','Dress':'Påklædning','Posture':'Holdning',
    'Proximity':'Nærhed','Physical':'Fysisk','Inventory':'Inventar',
    // Field labels — goals
    'Need':'Behov','Short-Term':'Kortsigtet','Long-Term':'Langsigtet',
    // Field labels — relationship meta
    'Time Known':'Kendte tid','Milestone':'Milepæl',
    // Field labels — meters
    'Affection':'Hengivenhed','Trust':'Tillid','Desire':'Begær','Stress':'Stress','Compat':'Kompat.',
    // Field labels — fertility
    'Status':'Status','Reason':'Årsag','Cycle Phase':'Cyklusfase','Cycle Day':'Cyklusdag',
    'Window':'Vindue','Pregnancy':'Graviditet','Preg. Week':'Grav. uge','Notes':'Noter',
    'Fertility: N/A':'Fertilitet: Ikke relevant',
    // Stats footer
    'Together':'Sammen','Separate':'Separat','Inspect':'Inspicér',
    'Auto':'Auto','Backup':'Sikkerhedskopi','Fallback':'Reserve','Full regen':'Fuld regen.','Settings':'Indstillinger',
    'Msg regen':'Besk. regen.','Thoughts':'Tanker',
    'Message index':'Beskedindeks','Estimated tokens':'Estimerede tokens','Generation time':'Genereringstid',
    // Panel Manager
    'Enable All':'Aktivér alle','Disable All':'Deaktivér alle','Custom Panels':'Brugerdefinerede paneler',
    '+ Add Custom Panel':'+ Tilføj brugerdefineret panel',
    'Expand/Collapse sections':'Fold ud/sammen sektioner','Condense view':'Kompakt visning',
    // Edit mode
    'Click any highlighted field to edit':'Klik på et fremhævet felt for at redigere',
    'Edit Mode On':'Redigeringstilstand til','Edit Mode Off':'Redigeringstilstand fra',
    // Mobile
    'Scene updated':'Scene opdateret','Open ScenePulse':'Åbn ScenePulse',
    // Loading
    'Updating scene data':'Opdaterer scenedata','Reading context and analyzing characters':'Læser kontekst og analyserer karakterer',
    // Settings sections/labels
    'Setup Guide':'Opsætningsguide','Guided Tour':'Guidet tur','Context msgs':'Kontekstbeskeder',
    'Max retries':'Maks. forsøg','Delta mode':'Deltatilstand','Injection Method':'Injektionsmetode',
    'Mode':'Tilstand','Fallback Recovery':'Reservegendannelse',
    'Enable automatic fallback':'Automatisk reserve','Fallback Profile':'Reserveprofil',
    'Fallback Preset':'Reserve-forudindstilling','Refresh Profiles':'Opdater profiler',
    'Connection Profile':'Forbindelsesprofil','Chat Completion Preset':'Chat-fuldførelsesindstilling',
    'Prompt Mode':'Prompt-tilstand','Context Embedding':'Kontekstindlejring',
    'Embed snapshots':'Indlejr øjebliksbilleder','Embed as role':'Indlejr som rolle',
    'System':'System','User':'Bruger','Assistant':'Assistent',
    'Lorebooks':'Lorebooks','Filter Mode':'Filtertilstand','Refresh Lorebooks':'Opdater lorebooks',
    'System Prompt':'Systemprompt','JSON Schema':'JSON-skema','Reset to Default':'Nulstil til standard',
    'Actions':'Handlinger','Generate':'Generér','Clear Data':'Ryd data','Reset Settings':'Nulstil indstillinger',
    'Debug':'Fejlsøgning','SP Log':'SP-log','View Log':'Vis log','Console':'Konsol',
    'Last Response':'Seneste svar','Active':'Aktiv','Off':'Fra',
    // Toast messages
    'Profiles refreshed':'Profiler opdateret','Fallback profiles refreshed':'Reserveprofiler opdateret',
    'Lorebooks refreshed':'Lorebooks opdateret','System prompt reset to default':'Systemprompt nulstillet',
    'Prompt copied':'Prompt kopieret','Schema reset to default':'Skema nulstillet',
    'Schema copied':'Skema kopieret','Done':'Færdig','Failed':'Mislykkedes',
    'Data cleared':'Data ryddet','Cleared':'Ryddet','Settings reset to defaults':'Indstillinger nulstillet',
    'SP Log copied':'SP-log kopieret','Console copied':'Konsol kopieret',
    'Copy failed':'Kopiering mislykkedes','No API response captured yet':'Intet API-svar fanget endnu',
    'Last response copied':'Seneste svar kopieret','Debug log copied':'Fejlsøgningslog kopieret',
    'Invalid JSON':'Ugyldig JSON',
    // Story ideas
    'Story direction sent':'Historieretning sendt','Story idea copied':'Historieidé kopieret',
    // Custom panels
    'Panel name':'Panelnavn','Key':'Nøgle','Label':'Etiket','Type':'Type','LLM Hint':'LLM-tip',
    'Add Field':'Tilføj felt','Delete panel':'Slet panel','Remove this field':'Fjern dette felt',
    'Drag to reorder':'Træk for at omarrangere','No custom panels yet':'Ingen brugerdefinerede paneler endnu',
    // Quest dialog
    'Quest name':'Opgavenavn','1-2 sentences from your perspective':'1-2 sætninger fra dit perspektiv',
},
'Norwegian': {
    // Section headers
    'Scene Details':'Scenedetaljer','Quest Journal':'Oppdragsjournal','Relationships':'Relasjoner',
    'Characters':'Karakterer','Story Ideas':'Historieidéer','Inner Thoughts':'Indre tanker',
    'North Star':'Nordstjernen','Main Quests':'Hovedoppdrag','Side Quests':'Sideoppdrag',
    'Active Tasks':'Aktive oppgaver',
    // Badges
    'new':'ny','updated':'oppdatert','resolved':'løst',
    // Buttons & actions
    'Add quest':'Legg til oppdrag','Cancel':'Avbryt','Add Quest':'Legg til','Regenerate all':'Regenerer alt',
    'Mark as completed':'Merk som fullført','Remove quest':'Fjern oppdrag','Restore quest':'Gjenopprett oppdrag',
    'Stop Generation':'■ Stopp','Jump to latest':'Til siste','Copy':'Kopier',
    // Empty states
    'No scene data yet':'Ingen scenedata ennå','Send a message or click ⟳ to generate.':'Send en melding eller klikk ⟳.',
    'No active storyline quests':'Ingen aktive historieoppdrag','No side quests discovered':'Ingen sideoppdrag oppdaget',
    'No immediate tasks':'Ingen presserende oppgaver','Not yet revealed':'Ikke avslørt ennå',
    // Form labels
    'Name':'Navn','Urgency':'Hast','Details':'Detaljer','Critical':'Kritisk','High':'Høy','Moderate':'Middels','Low':'Lav',
    // Tooltips
    'Toggle edit mode':'Veksle redigeringsmodus','Show empty fields':'Vis tomme felt',
    'Snap to left of chat':'Fest til venstre','Ghost mode':'Spøkelsesmodus','Regenerate thoughts':'Regenerer tanker',
    'Hide thoughts':'Skjul tanker','Hide panel':'Skjul panel','Panel Manager':'Panelbehandler',
    // Loading
    'Generating Scene':'Genererer scene','Updating thoughts':'Oppdaterer tanker','Analyzing context':'Analyserer kontekst',
    // Diff viewer
    'Payload Inspector':'Datainspektør','Changes Only':'Kun endringer','Full Diff':'Full sammenligning',
    'Side by Side':'Side ved side','Delta Payload':'Delta','Previous':'Forrige','Current':'Nåværende','Full Payload':'Full data',
    // Toasts
    'Completed':'Fullført','Removed':'Fjernet','Added':'Lagt til','Regenerated':'Regenerert','Regeneration failed':'Regenerering feilet',
    'Remove Quest':'Fjern oppdrag','Copied!':'Kopiert!',
    // Settings
    'General':'Generelt','Enable ScenePulse':'Aktiver ScenePulse','Auto-generate on AI messages':'Automatisk generering ved AI-meldinger',
    'Show thought bubbles':'Vis tankebobler','Weather overlay effects':'Væreffekter','Time-of-day ambience':'Tidsmiljø',
    'Font scale':'Skriftstørrelse','Language':'Språk','Auto-detect':'Automatisk oppdagelse',
    'Show developer tools':'Utviklerverktøy',
    // Field labels — scene
    'Topic':'Emne','Mood':'Stemning','Interaction':'Interaksjon','Tension':'Spenning',
    'Summary':'Sammendrag','Sounds':'Lyder','Present':'Til stede',
    // Field labels — character appearance
    'Hair':'Hår','Face':'Ansikt','Outfit':'Antrekk','Dress':'Klesdrakt','Posture':'Holdning',
    'Proximity':'Nærhet','Physical':'Fysisk','Inventory':'Inventar',
    // Field labels — goals
    'Need':'Behov','Short-Term':'Kortsiktig','Long-Term':'Langsiktig',
    // Field labels — relationship meta
    'Time Known':'Kjent tid','Milestone':'Milepæl',
    // Field labels — meters
    'Affection':'Hengivenhet','Trust':'Tillit','Desire':'Begjær','Stress':'Stress','Compat':'Kompat.',
    // Field labels — fertility
    'Status':'Status','Reason':'Årsak','Cycle Phase':'Syklusfase','Cycle Day':'Syklusdag',
    'Window':'Vindu','Pregnancy':'Graviditet','Preg. Week':'Grav. uke','Notes':'Notater',
    'Fertility: N/A':'Fertilitet: Ikke relevant',
    // Stats footer
    'Together':'Sammen','Separate':'Separat','Inspect':'Inspiser',
    'Auto':'Auto','Backup':'Sikkerhetskopi','Fallback':'Reserve','Full regen':'Full regen.','Settings':'Innstillinger',
    'Msg regen':'Meld. regen.','Thoughts':'Tanker',
    'Message index':'Meldingsindeks','Estimated tokens':'Estimerte tokens','Generation time':'Genereringstid',
    // Panel Manager
    'Enable All':'Aktiver alle','Disable All':'Deaktiver alle','Custom Panels':'Egendefinerte paneler',
    '+ Add Custom Panel':'+ Legg til egendefinert panel',
    'Expand/Collapse sections':'Utvid/Skjul seksjoner','Condense view':'Kompakt visning',
    // Edit mode
    'Click any highlighted field to edit':'Klikk på et uthevet felt for å redigere',
    'Edit Mode On':'Redigeringsmodus på','Edit Mode Off':'Redigeringsmodus av',
    // Mobile
    'Scene updated':'Scene oppdatert','Open ScenePulse':'Åpne ScenePulse',
    // Loading
    'Updating scene data':'Oppdaterer scenedata','Reading context and analyzing characters':'Leser kontekst og analyserer karakterer',
    // Settings sections/labels
    'Setup Guide':'Oppsettguide','Guided Tour':'Guidet tur','Context msgs':'Kontekstmeldinger',
    'Max retries':'Maks. forsøk','Delta mode':'Deltamodus','Injection Method':'Injeksjonsmetode',
    'Mode':'Modus','Fallback Recovery':'Reservegjenoppretting',
    'Enable automatic fallback':'Automatisk reserve','Fallback Profile':'Reserveprofil',
    'Fallback Preset':'Reserveforhåndsinnstilling','Refresh Profiles':'Oppdater profiler',
    'Connection Profile':'Tilkoblingsprofil','Chat Completion Preset':'Fullføringsinnstilling for chat',
    'Prompt Mode':'Promptmodus','Context Embedding':'Kontekstinnbygging',
    'Embed snapshots':'Bygg inn øyeblikksbilder','Embed as role':'Bygg inn som rolle',
    'System':'System','User':'Bruker','Assistant':'Assistent',
    'Lorebooks':'Lorebooks','Filter Mode':'Filtermodus','Refresh Lorebooks':'Oppdater lorebooks',
    'System Prompt':'Systemprompt','JSON Schema':'JSON-skjema','Reset to Default':'Tilbakestill til standard',
    'Actions':'Handlinger','Generate':'Generer','Clear Data':'Tøm data','Reset Settings':'Tilbakestill innstillinger',
    'Debug':'Feilsøking','SP Log':'SP-logg','View Log':'Vis logg','Console':'Konsoll',
    'Last Response':'Siste svar','Active':'Aktiv','Off':'Av',
    // Toast messages
    'Profiles refreshed':'Profiler oppdatert','Fallback profiles refreshed':'Reserveprofiler oppdatert',
    'Lorebooks refreshed':'Lorebooks oppdatert','System prompt reset to default':'Systemprompt tilbakestilt',
    'Prompt copied':'Prompt kopiert','Schema reset to default':'Skjema tilbakestilt',
    'Schema copied':'Skjema kopiert','Done':'Ferdig','Failed':'Mislyktes',
    'Data cleared':'Data tømt','Cleared':'Tømt','Settings reset to defaults':'Innstillinger tilbakestilt',
    'SP Log copied':'SP-logg kopiert','Console copied':'Konsoll kopiert',
    'Copy failed':'Kopiering mislyktes','No API response captured yet':'Ingen API-respons fanget ennå',
    'Last response copied':'Siste svar kopiert','Debug log copied':'Feilsøkingslogg kopiert',
    'Invalid JSON':'Ugyldig JSON',
    // Story ideas
    'Story direction sent':'Historieretning sendt','Story idea copied':'Historieidé kopiert',
    // Custom panels
    'Panel name':'Panelnavn','Key':'Nøkkel','Label':'Etikett','Type':'Type','LLM Hint':'LLM-tips',
    'Add Field':'Legg til felt','Delete panel':'Slett panel','Remove this field':'Fjern dette feltet',
    'Drag to reorder':'Dra for å omorganisere','No custom panels yet':'Ingen egendefinerte paneler ennå',
    // Quest dialog
    'Quest name':'Oppdragsnavn','1-2 sentences from your perspective':'1-2 setninger fra ditt perspektiv',
},
'Hebrew': {
    // Section headers
    'Scene Details':'פרטי סצנה','Quest Journal':'יומן משימות','Relationships':'יחסים',
    'Characters':'דמויות','Story Ideas':'רעיונות לסיפור','Inner Thoughts':'מחשבות פנימיות',
    'North Star':'כוכב הצפון','Main Quests':'משימות ראשיות','Side Quests':'משימות משנה',
    'Active Tasks':'משימות פעילות',
    // Badges
    'new':'חדש','updated':'עודכן','resolved':'הושלם',
    // Buttons & actions
    'Add quest':'הוסף משימה','Cancel':'ביטול','Add Quest':'הוסף','Regenerate all':'צור הכול מחדש',
    'Mark as completed':'סמן כהושלם','Remove quest':'הסר משימה','Restore quest':'שחזר משימה',
    'Stop Generation':'■ עצור','Jump to latest':'לאחרון','Copy':'העתק',
    // Empty states
    'No scene data yet':'אין נתוני סצנה עדיין','Send a message or click ⟳ to generate.':'שלח הודעה או לחץ ⟳ ליצירה.',
    'No active storyline quests':'אין משימות עלילה פעילות','No side quests discovered':'לא נמצאו משימות משנה',
    'No immediate tasks':'אין משימות דחופות','Not yet revealed':'טרם נחשף',
    // Form labels
    'Name':'שם','Urgency':'דחיפות','Details':'פרטים','Critical':'קריטי','High':'גבוה','Moderate':'בינוני','Low':'נמוך',
    // Tooltips
    'Toggle edit mode':'מצב עריכה','Show empty fields':'הצג שדות ריקים',
    'Snap to left of chat':'הצמד משמאל לצ\'אט','Ghost mode':'מצב רוח רפאים','Regenerate thoughts':'צור מחשבות מחדש',
    'Hide thoughts':'הסתר מחשבות','Hide panel':'הסתר לוח','Panel Manager':'מנהל לוחות',
    // Loading
    'Generating Scene':'יוצר סצנה','Updating thoughts':'מעדכן מחשבות','Analyzing context':'מנתח הקשר',
    // Diff viewer
    'Payload Inspector':'בודק נתונים','Changes Only':'שינויים בלבד','Full Diff':'השוואה מלאה',
    'Side by Side':'זה לצד זה','Delta Payload':'דלתא','Previous':'קודם','Current':'נוכחי','Full Payload':'נתונים מלאים',
    // Toasts
    'Completed':'הושלם','Removed':'הוסר','Added':'נוסף','Regenerated':'נוצר מחדש','Regeneration failed':'היצירה מחדש נכשלה',
    'Remove Quest':'הסר משימה','Copied!':'הועתק!',
    // Settings
    'General':'כללי','Enable ScenePulse':'הפעל ScenePulse','Auto-generate on AI messages':'יצירה אוטומטית בהודעות AI',
    'Show thought bubbles':'הצג בועות מחשבה','Weather overlay effects':'אפקטי מזג אוויר','Time-of-day ambience':'אווירת שעת היום',
    'Font scale':'גודל גופן','Language':'שפה','Auto-detect':'זיהוי אוטומטי',
    'Show developer tools':'כלי מפתח',
    // Field labels — scene
    'Topic':'נושא','Mood':'מצב רוח','Interaction':'אינטראקציה','Tension':'מתח',
    'Summary':'תקציר','Sounds':'צלילים','Present':'נוכחים',
    // Field labels — character appearance
    'Hair':'שיער','Face':'פנים','Outfit':'לבוש','Dress':'מלבוש','Posture':'יציבה',
    'Proximity':'קרבה','Physical':'מצב גופני','Inventory':'מלאי',
    // Field labels — goals
    'Need':'צורך','Short-Term':'קצר טווח','Long-Term':'ארוך טווח',
    // Field labels — relationship meta
    'Time Known':'זמן היכרות','Milestone':'אבן דרך',
    // Field labels — meters
    'Affection':'חיבה','Trust':'אמון','Desire':'תשוקה','Stress':'לחץ','Compat':'תאימות',
    // Field labels — fertility
    'Status':'מצב','Reason':'סיבה','Cycle Phase':'שלב המחזור','Cycle Day':'יום המחזור',
    'Window':'חלון','Pregnancy':'הריון','Preg. Week':'שבוע הריון','Notes':'הערות',
    'Fertility: N/A':'פוריות: לא רלוונטי',
    // Stats footer
    'Together':'יחד','Separate':'נפרד','Inspect':'בדיקה',
    'Auto':'אוטו','Backup':'גיבוי','Fallback':'חלופי','Full regen':'יצירה מחדש מלאה','Settings':'הגדרות',
    'Msg regen':'יצירת הודעה מחדש','Thoughts':'מחשבות',
    'Message index':'אינדקס הודעה','Estimated tokens':'טוקנים משוערים','Generation time':'זמן יצירה',
    // Panel Manager
    'Enable All':'הפעל הכול','Disable All':'השבת הכול','Custom Panels':'לוחות מותאמים',
    '+ Add Custom Panel':'+ הוסף לוח מותאם',
    'Expand/Collapse sections':'הרחב/כווץ חלקים','Condense view':'תצוגה מרוכזת',
    // Edit mode
    'Click any highlighted field to edit':'לחץ על שדה מודגש לעריכה',
    'Edit Mode On':'מצב עריכה פעיל','Edit Mode Off':'מצב עריכה כבוי',
    // Mobile
    'Scene updated':'הסצנה עודכנה','Open ScenePulse':'פתח ScenePulse',
    // Loading
    'Updating scene data':'מעדכן נתוני סצנה','Reading context and analyzing characters':'קורא הקשר ומנתח דמויות',
    // Settings sections/labels
    'Setup Guide':'מדריך הגדרה','Guided Tour':'סיור מודרך','Context msgs':'הודעות הקשר',
    'Max retries':'מקס. ניסיונות','Delta mode':'מצב דלתא','Injection Method':'שיטת הזרקה',
    'Mode':'מצב','Fallback Recovery':'שחזור חלופי',
    'Enable automatic fallback':'הפעל חלופי אוטומטי','Fallback Profile':'פרופיל חלופי',
    'Fallback Preset':'הגדרה חלופית','Refresh Profiles':'רענן פרופילים',
    'Connection Profile':'פרופיל חיבור','Chat Completion Preset':'הגדרת השלמת צ\'אט',
    'Prompt Mode':'מצב פרומפט','Context Embedding':'הטמעת הקשר',
    'Embed snapshots':'הטמע תמונות מצב','Embed as role':'הטמע כתפקיד',
    'System':'מערכת','User':'משתמש','Assistant':'עוזר',
    'Lorebooks':'ספרי ידע','Filter Mode':'מצב סינון','Refresh Lorebooks':'רענן ספרי ידע',
    'System Prompt':'פרומפט מערכת','JSON Schema':'סכמת JSON','Reset to Default':'אפס לברירת מחדל',
    'Actions':'פעולות','Generate':'צור','Clear Data':'נקה נתונים','Reset Settings':'אפס הגדרות',
    'Debug':'ניפוי שגיאות','SP Log':'יומן SP','View Log':'הצג יומן','Console':'קונסול',
    'Last Response':'תגובה אחרונה','Active':'פעיל','Off':'כבוי',
    // Toast messages
    'Profiles refreshed':'פרופילים רועננו','Fallback profiles refreshed':'פרופילים חלופיים רועננו',
    'Lorebooks refreshed':'ספרי ידע רועננו','System prompt reset to default':'פרומפט מערכת אופס',
    'Prompt copied':'פרומפט הועתק','Schema reset to default':'סכמה אופסה',
    'Schema copied':'סכמה הועתקה','Done':'בוצע','Failed':'נכשל',
    'Data cleared':'נתונים נוקו','Cleared':'נוקה','Settings reset to defaults':'הגדרות אופסו',
    'SP Log copied':'יומן SP הועתק','Console copied':'קונסול הועתק',
    'Copy failed':'ההעתקה נכשלה','No API response captured yet':'טרם נלכדה תגובת API',
    'Last response copied':'תגובה אחרונה הועתקה','Debug log copied':'יומן ניפוי הועתק',
    'Invalid JSON':'JSON לא תקין',
    // Story ideas
    'Story direction sent':'כיוון הסיפור נשלח','Story idea copied':'רעיון לסיפור הועתק',
    // Custom panels
    'Panel name':'שם לוח','Key':'מפתח','Label':'תווית','Type':'סוג','LLM Hint':'רמז LLM',
    'Add Field':'הוסף שדה','Delete panel':'מחק לוח','Remove this field':'הסר שדה זה',
    'Drag to reorder':'גרור לסידור מחדש','No custom panels yet':'אין לוחות מותאמים עדיין',
    // Quest dialog
    'Quest name':'שם משימה','1-2 sentences from your perspective':'1-2 משפטים מנקודת המבט שלך',
},
};

let _currentLang = '';

/**
 * Translate a UI string. Returns translation if available, otherwise the English key.
 * @param {string} key - English string to translate
 * @returns {string} Translated string or English fallback
 */
export function t(key) {
    if (!_currentLang) _currentLang = getLanguage();
    if (!_currentLang) return key; // English or auto-detect as English
    const table = TRANSLATIONS[_currentLang];
    if (!table) return key;
    return table[key] || key;
}

/** Reset cached language (call when language setting changes). */
export function resetI18nCache() { _currentLang = ''; }
