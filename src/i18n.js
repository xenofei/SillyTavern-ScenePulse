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
