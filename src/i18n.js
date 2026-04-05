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
