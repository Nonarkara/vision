// The next human action, not a second description of the learning algorithm.
export function lessonGuide({ mode, counts, learned, groups, pending, rounds, collecting, practice, names, testPending = null, lastTest = null, review = null, sourceReady = true, t }) {
  const steps = mode === 'supervised'
    ? [t('เก็บภาพพร้อมคำตอบ', 'Save pictures + answers', '保存图片和答案'), t('ให้เครื่องเรียน', 'Let it learn', '让模型学习'), t('ลองภาพใหม่', 'Try a new picture', '试试新图片')]
    : mode === 'unsupervised'
      ? [t('ให้ภาพที่เปลี่ยนไป', 'Show changing pictures', '展示不同画面'), t('เครื่องจัดสองกลุ่ม', 'It makes two groups', '模型分成两组'), t('คุณดูว่าคล้ายกันตรงไหน', 'You look for similarities', '观察相似之处')]
      : [t('เครื่องเลือกการกระทำ', 'It picks an action', '模型选择行动'), t('คุณให้คะแนน', 'You give a score', '你来评分'), t('ลองอีกภาพ', 'Try another picture', '再试一张图片')]
  if (!sourceReady && !pending && !review) return {
    steps, step:0,
    title:t('รอภาพพร้อมก่อน', 'Wait for a picture', '等待画面就绪'),
    help:t('รอภาพเปิด หรือเลือกแหล่งภาพอื่นด้านล่าง ปุ่มบทเรียนจะพร้อมเมื่ออ่านภาพได้', 'Wait for the picture to open, or choose another source below. Lesson buttons become available when the picture is ready.', '等待画面打开，或在下方选择其他来源。画面就绪后，课程按钮即可使用。'),
  }
  let step = 0, title, help
  if (mode === 'supervised') {
    const target = counts[0] < 3 ? 0 : counts[1] < 3 ? 1 : null
    step = learned ? 2 : target === null ? 1 : 0
    title = learned ? t('ลองภาพที่ยังไม่เคยสอน', 'Try a picture it has not learned', '试试尚未教过的图片')
      : target === null ? t('พร้อมแล้ว ให้เครื่องเรียน', 'Pictures ready. Let it learn.', '图片已准备好，让模型学习。')
        : t(`เก็บภาพ “${names[target]}” อีก ${3 - counts[target]} ภาพ`, `Save ${3 - counts[target]} more ${names[target]} ${3 - counts[target] === 1 ? 'picture' : 'pictures'}`, `再保存 ${3 - counts[target]} 张“${names[target]}”图片`)
    help = learned
      ? t('เปลี่ยนภาพ แล้วกดค้างภาพใหม่ให้ทาย คุณค่อยตรวจคำตอบ ยังไม่ใช้ภาพนี้สอน', 'Change the picture, then press “Hold a new frame & guess”. Check its answer before teaching it this picture.', '更换画面，再按“暂停新画面并预测”。先核对答案，再决定是否用它训练。')
      : target === null
        ? t('กดเรียนด้านล่าง เครื่องจะใช้ภาพที่คุณเก็บไว้หาความคล้าย', 'Press Learn below. It will use the pictures you saved to find similarities.', '按下方的学习按钮。模型将使用你保存的图片寻找相似之处。')
        : t(practice ? 'เลือกฉากให้ตรงคำตอบ กดบันทึกหนึ่งครั้งได้หนึ่งภาพ รอภาพเปลี่ยนแล้วกดอีกครั้ง' : 'รอให้จอแสดงสิ่งที่ตรงกับคำตอบ หรือเปลี่ยนกล้อง แล้วกดบันทึกครั้งละภาพ', practice ? 'Choose the matching view. Each Save keeps one picture; wait for it to change.' : 'Wait until the view matches the answer, or change camera. Then press Save below: one click = one picture.', practice ? '在画面下选择相应场景，再按下方保存：每按一次保存一张。等画面变化后再保存。' : '等待画面符合答案，或更换摄像头。再按保存：每按一次保存一张。')
    if (learned && testPending) {
      title = t('ตรวจภาพที่ค้างไว้นี้', 'Check this held picture', '核对这张暂停的图片')
      help = t('เครื่องทายแล้ว คุณเลือกคำตอบจริงด้านล่าง หรือกดดูไม่ออก ยังไม่ใช้ภาพนี้สอน', 'It has guessed. Choose the true answer below, or Cannot tell. This picture has not been used to teach it.', '模型已预测。请选择下方的真实答案，或“无法判断”。这张图片尚未用于训练。')
    } else if (learned && review && lastTest) {
      title = t('ตรวจแล้ว ลองภาพต่อไป', 'Checked. Try another picture.', '已核对，试试下一张图片。')
      help = t('กดเล่นวิดีโอต่อเพื่อทดสอบภาพใหม่ หรือกดใช้คำตอบนี้สอนถ้าต้องการเพิ่มตัวอย่าง', 'Press Continue video for a new test picture. Or choose Teach this answer to add this picture to its examples.', '按“继续视频”测试新图片。也可选“用此答案训练”将本图加入样本。')
    }
  } else if (mode === 'unsupervised') {
    step = groups ? 2 : collecting ? 1 : 0
    title = groups ? t('สองกลุ่มนี้คล้ายกันตรงไหน?', 'What looks alike in each group?', '每组的图片有什么相似之处？') : collecting ? t('กำลังเก็บภาพให้เครื่อง', 'Collecting pictures for the machine', '正在为模型收集图片') : t('กดครั้งเดียว แล้วดูมันจัดกลุ่ม', 'Press once. Watch it make groups.', '按一次，看模型分组。')
    help = groups ? t('ดูภาพสองกลุ่มด้านล่าง มันอาจแยกตามแสงหรือมุมกล้อง ไม่ได้รู้เองว่ารถแน่นหรือโล่ง', 'Compare the pictures below. It may split them by light or camera angle. It does not know “busy” or “quiet”.', '比较下方两组图片。模型可能按光线或角度分组，并不知道“繁忙”或“清静”。')
      : t(practice ? 'เครื่องจะสลับสองฉากเอง เก็บ 24 ภาพ แล้วจัดเป็นสองกลุ่ม ไม่ต้องบอกคำตอบ เปิดจอนี้ไว้ประมาณ 24 วินาที' : 'ใช้วิดีโอที่ภาพเปลี่ยน เครื่องจะเก็บ 24 ภาพแล้วจัดสองกลุ่ม ไม่ต้องบอกคำตอบ เปิดจอนี้ไว้ประมาณ 24 วินาที', practice ? 'It switches between both scenes, takes 24 pictures, then sorts them into two groups. Give it no answers. Keep this view open for about 24 seconds.' : 'Use a changing video. It takes 24 pictures, then sorts them into two groups. Give it no answers. Keep this view open for about 24 seconds.', practice ? '系统会自动切换两个场景，收集 24 张图片并分成两组。无需给答案。请保持此画面打开约 24 秒。' : '使用画面有变化的视频。系统收集 24 张图片并分成两组，无需给答案。请保持此画面打开约 24 秒。')
  } else {
    step = pending ? 1 : rounds ? 2 : 0
    title = pending ? t('การเลือกนี้เหมาะไหม?', 'Was that a good choice?', '这个选择合适吗？') : t('ให้เครื่องลองเลือกก่อน', 'Let the machine choose first', '先让模型选择')
    help = pending ? t('ดูภาพที่ค้างไว้: รถแน่นควรแจ้งเตือน ถนนโล่งควรเงียบ กด +1 ถ้าเลือกเหมาะ หรือ −1 ถ้าเลือกไม่เหมาะ', 'Look at the held picture: busy traffic should get an alert; a quiet road should stay quiet. Give +1 if its action fits, or −1 if it does not.', '看暂停的图片：繁忙时应提醒，清静时应保持安静。行动合适给 +1，不合适给 −1。') : t('เป้าหมาย: รถแน่นให้แจ้งเตือน ถนนโล่งให้เงียบ กดลองเลือก ภาพจะค้างไว้ ให้ +1 เมื่อเลือกเหมาะ หรือ −1 เมื่อเลือกไม่เหมาะ แล้วลองภาพใหม่', 'Goal: alert for busy traffic; stay quiet for a quiet road. Press Try an action. The picture freezes. Give +1 for a good choice or −1 for a wrong choice, then try a new picture.', '目标：繁忙时提醒，清静时保持安静。按“试着选择行动”，画面会暂停。合适给 +1，不合适给 −1，再试新图片。')
  }
  return { steps, step, title, help }
}
