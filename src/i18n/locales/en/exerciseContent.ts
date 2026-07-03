const exerciseContent = {
  breathing: {
    description:
      'Breathing using your diaphragm rather than your chest. This is the most fundamental technique in all vocal training \u2014 without it, every other exercise loses half its effectiveness.',
    sensations: {
      0: 'Your belly inflates like a balloon as you inhale',
      1: 'Your belly slowly flattens as you exhale',
      2: 'Your chest, neck, and shoulders remain completely still',
    },
    soundDescription:
      'Inhale quietly through your nose; exhale with a gentle "sss\u2014" sound as air escapes between your upper and lower teeth. Similar to air slowly leaking from a tire.',
    mistakes: {
      0: {
        mistake: 'Chest rises noticeably',
        fix: 'Practice lying down \u2014 diaphragmatic breathing happens naturally in this position. If the hand on your chest moves, try again.',
      },
      1: {
        mistake: 'Forcing the belly outward',
        fix: 'Let it inflate naturally, like filling a balloon. Relax and let the air push your belly out on its own.',
      },
      2: {
        mistake: 'Exhale is choppy or uneven',
        fix: 'Keep it steady, as if you are making a candle flame flicker without blowing it out.',
      },
      3: {
        mistake: 'Throat tightens when holding breath',
        fix: 'Practice pausing with your diaphragm, not your throat. Think "resting" rather than "stopping."',
      },
    },
    levelTips: {
      1: 'Lie down and follow the on-screen breathing guide through each inhale-hold-exhale cycle.',
      2: 'Switch to a seated position and extend your exhale to 8 seconds.',
      3: 'Standing position \u2014 aim for exhales of 10 seconds or longer.',
      4: 'Use diaphragmatic breathing as a natural warm-up before vocal exercises.',
      5: 'Practice until diaphragmatic breathing becomes your default, even without thinking about it.',
    },
  },
  humming: {
    description:
      'Producing a sustained "mmm\u2014" sound with your lips gently closed. It is the easiest way to feel your vocal folds vibrating with minimal strain \u2014 the very first step in vocal training.',
    sensations: {
      0: 'A buzzing vibration around your nose and upper lip',
      1: 'A light tingling sensation on your lips',
      2: 'No effort in your throat \u2014 the sound feels like it comes from your nose',
    },
    soundDescription:
      'A quiet "mmm\u2014" like a refrigerator humming softly. It should be clear and even, with no breathy leakage.',
    mistakes: {
      0: {
        mistake: 'Pressing lips together too tightly',
        fix: 'Your lips only need to touch lightly. Keep a small gap between your teeth.',
      },
      1: {
        mistake: 'Volume is too loud',
        fix: 'Use a comfortable conversational volume, or slightly softer.',
      },
      2: {
        mistake: 'Vibration felt in the throat instead of the nose',
        fix: 'Maintain the open-throat sensation you feel at the start of a yawn while humming.',
      },
      3: {
        mistake: 'Pitch wobbles',
        fix: 'Use diaphragmatic breathing to push a steady stream of air from your belly.',
      },
    },
    levelTips: {
      1: 'Hold one comfortable pitch and repeat steadily until the session ends.',
      2: 'Expand to 3\u20134 pitches and aim for 15-second sustained hums.',
      3: 'Target jitter below 2% and a stability score of 70 or above.',
      4: 'Transition smoothly from humming into resonant voice exercises.',
      5: 'Maintain a stable hum at any pitch throughout your range.',
    },
  },
  lip_trill: {
    description:
      'Making a "brrr\u2014" sound by letting your lips flutter while voicing. Think of the sound a child makes imitating a car engine, but with an "mmm" added underneath.',
    sensations: {
      0: 'Your lips fluttering lightly and rapidly in a "brrr" motion',
      1: 'Vibrations around your nose similar to humming',
      2: 'A steady stream of air rising from your belly',
    },
    soundDescription:
      'A steady "brrr\u2014" like a small motorboat engine. The sound should be even \u2014 the trill should not stop or turn into a plain "pff\u2014."',
    mistakes: {
      0: {
        mistake: 'Lips do not trill',
        fix: 'Support your cheeks with your fingertips and completely relax your lips.',
      },
      1: {
        mistake: 'Trill cuts out mid-way',
        fix: 'Stabilize your diaphragmatic breathing first, then try again. Focus on a steady push from your belly.',
      },
      2: {
        mistake: 'Jaw is tense',
        fix: 'Shake your jaw side to side to loosen it before starting. Keep the feeling of your lower jaw hanging loosely.',
      },
      3: {
        mistake: 'Cheeks puff out',
        fix: 'Supporting your cheeks lightly with your fingertips will solve this naturally.',
      },
    },
    levelTips: {
      1: 'Hold one comfortable pitch and repeat steadily until the session ends.',
      2: 'Expand to 3\u20134 pitches and practice slow glides.',
      3: 'Aim for a stability score of 60+. Check that your pitch line is smooth during glides.',
      4: 'Practice one-octave glides.',
      5: 'Maintain an even trill across your full range.',
    },
  },
  breath_sustain: {
    description:
      'Sustaining a sound as long as possible on a single breath at a comfortable pitch. This is the practical application of diaphragmatic breathing, measuring and building real vocal endurance.',
    sensations: {
      0: 'A steady sensation of air slowly leaving your belly',
      1: 'The sound stays stable without trembling until the end \u2014 like a ship sailing smoothly',
      2: 'Only your abdomen feels fatigued over time, never your throat',
    },
    soundDescription:
      'A steady "ah\u2014" or "uh\u2014" at a comfortable pitch. Keep both volume and pitch unchanged from start to finish.',
    mistakes: {
      0: {
        mistake: 'Choosing a pitch that is too high or too low',
        fix: 'Pick the pitch most comfortable when speaking normally. You can sustain your comfortable pitch the longest.',
      },
      1: {
        mistake: 'Sound becomes shaky or unstable toward the end',
        fix: 'Stop when the sound starts to waver. The key is to extend gradually over time.',
      },
      2: {
        mistake: 'Hyperventilating to take in maximum air',
        fix: 'Inhale only about 80%. Excessive inhalation actually tenses the vocal folds.',
      },
    },
    levelTips: {
      1: 'Hold as long as you can at a comfortable pitch, and repeat until the session ends.',
      2: 'Target 8 seconds while keeping exhale speed constant.',
      3: 'Hold for 12 seconds with HNR above 12 dB \u2014 maintain a clean tone.',
      4: '18-second target \u2014 sustain without any tremor to the very end.',
      5: '25 seconds or more \u2014 the pinnacle of vocal endurance.',
    },
  },
  straw: {
    description:
      'Voicing an "mmm\u2014" through a thin straw held between your lips. This is one of the most scientifically validated vocal warm-up techniques (semi-occluded vocal tract exercise).',
    sensations: {
      0: 'Vibration felt around the lips and nose',
      1: 'A sensation of steady airflow being pushed from your belly',
      2: 'No effort in the throat at all \u2014 if it feels "too easy," you are doing it right',
    },
    soundDescription:
      'A soft "oo\u2014" or "boo\u2014" sound coming through the straw. Similar to a whistle but lower and more stable.',
    mistakes: {
      0: {
        mistake: 'Air leaks around the straw',
        fix: 'Seal your lips firmly around the straw. Pucker slightly to create a tight seal.',
      },
      1: {
        mistake: 'Using a straw that is too wide',
        fix: 'A thin straw with a 3\u20135 mm diameter works best.',
      },
      2: {
        mistake: 'Blowing too hard',
        fix: 'Use only the effort of comfortable speech \u2014 no more.',
      },
      3: {
        mistake: 'Air escapes through the nose',
        fix: 'Try pinching your nose briefly to feel the difference, then direct all air through the straw.',
      },
    },
    levelTips: {
      1: 'Hold one comfortable pitch and repeat steadily until the session ends.',
      2: 'Practice various pitches and slow glides.',
      3: 'Aim for a stability score of 70 or above.',
      4: 'Dip the straw tip into a cup of water and check that the bubbles stay even.',
      5: 'Maintain the same relaxed phonation feeling even without the straw.',
    },
  },
  yawn_sigh: {
    description:
      'Opening your mouth wide as if starting a yawn, then letting your voice slide from a high pitch down to a low pitch with a breathy "haah\u2014" sigh. The most natural way to relax the larynx.',
    sensations: {
      0: 'A cool, open sensation in your throat, as if mid-yawn',
      1: 'The sound flowing naturally downward from high to low',
      2: 'A feeling of complete release \u2014 no effort in the throat at all',
    },
    soundDescription:
      'A big sigh you would make when waking up \u2014 "haah~ah~." A light, loose, breathy sound gliding smoothly from high to low.',
    mistakes: {
      0: {
        mistake: 'Pitch cuts off abruptly on the way down',
        fix: 'Reduce volume and keep it lighter. Do not stop at the break point \u2014 let the sound flow through.',
      },
      1: {
        mistake: 'Throat tightens at the starting high pitch',
        fix: 'Start lower. Only practice from a height where you can begin comfortably.',
      },
      2: {
        mistake: 'Making the sound without the yawn motion',
        fix: 'Do several real yawns first to memorize the sensation, then add voicing.',
      },
      3: {
        mistake: 'Voice is too loud',
        fix: 'A quiet, talking-to-yourself volume is plenty.',
      },
    },
    levelTips: {
      1: 'Do descending sighs within a comfortable range, repeating until the session ends.',
      2: 'Gradually raise your starting pitch.',
      3: 'Check that your pitch line traces a smooth, unbroken curve.',
      4: 'Use this as a warm-up before every vocal practice session.',
      5: 'Establish this as your go-to laryngeal relaxation routine before any exercise.',
    },
  },
  flow: {
    description:
      'Starting with an "h" sound and transitioning into a gentle, slightly breathy vowel ("hah\u2014"). The sensation is of placing your voice on top of the airflow \u2014 phonation riding on breath.',
    sensations: {
      0: 'The vocal folds begin vibrating gently and smoothly',
      1: 'No throat tension, yet the tone is clear',
      2: 'A light feeling as if your voice is floating on a cushion of air',
    },
    soundDescription:
      '"Hah\u2014ah\u2014": starting with an "h" airflow that transitions naturally into a clear "ah\u2014." A warm, soft sound \u2014 like a radio announcer speaking in a relaxed tone.',
    mistakes: {
      0: {
        mistake: 'Starting with a hard "ah!" (hard glottal attack)',
        fix: 'Always start with an "h." Breath first, voice second \u2014 like sighing.',
      },
      1: {
        mistake: 'The entire sound stays breathy',
        fix: 'Make the "ah" vowel a bit more distinct so it is clearly audible.',
      },
      2: {
        mistake: 'Throat tightens progressively while sustaining',
        fix: 'If you run low on breath, stop without hesitation and take a new breath.',
      },
      3: {
        mistake: 'Belly collapses suddenly inward',
        fix: 'Your belly should deflate slowly \u2014 like air gradually leaving a balloon.',
      },
    },
    levelTips: {
      1: 'Hold "hah\u2014" at a comfortable pitch and repeat steadily until the session ends.',
      2: 'Practice 15-second sustains at various pitches.',
      3: 'Stability score 70+. Try vowel transitions ("hah\u2014heh\u2014hee\u2014hoh\u2014hoo\u2014").',
      4: 'Apply the flow phonation sensation to actual speech and singing.',
      5: 'Eliminate hard glottal attack habits in your everyday voice.',
    },
  },
  resonant: {
    description:
      'Keeping the buzzing sensation you felt in your nose and face during humming, then opening your mouth to transition into vowels like "mmm\u2014mah\u2014ah\u2014." This bridges the ease of humming to real speech and singing.',
    sensations: {
      0: 'The nose and lip vibrations from humming persist even after opening your mouth',
      1: 'A sensation of the sound resonating in the front of your face',
      2: 'No throat effort, yet the tone is clear and resonant',
    },
    soundDescription:
      '"Mmm\u2014mah\u2014ah\u2014": a smooth transition from hum to open vowel. The "ring" of the hum should remain even on the open vowel. Like sound reverberating in a cathedral.',
    mistakes: {
      0: {
        mistake: 'Vibration disappears when the mouth opens',
        fix: 'Open your mouth very gradually. Only open as far as the vibration is maintained.',
      },
      1: {
        mistake: 'A nasal, congested quality remains',
        fix: 'If "ah" is blocked when you pinch your nose, that is excessive nasality. Keep the resonance placement but reduce the nasal component.',
      },
      2: {
        mistake: 'Volume changes abruptly',
        fix: 'Keep the entire transition on one breath, maintaining a smooth, even volume throughout.',
      },
      3: {
        mistake: 'Gap between "mmm" and "ah"',
        fix: 'Let the /m/ consonant flow naturally into the vowel \u2014 as if saying "mama."',
      },
    },
    levelTips: {
      1: '"Mmm\u2014mah\u2014ah\u2014" on one pitch, repeating until the session ends.',
      2: 'Cycle through 4 vowels: ah, ee, oh, oo.',
      3: 'HNR above 15 dB \u2014 maintain resonance on any vowel.',
      4: 'Extend into words: "mmm\u2014mah\u2014my name is..."',
      5: 'Apply resonant voice naturally in everyday conversation.',
    },
  },
  vibrato: {
    description:
      'A periodic pitch oscillation that emerges naturally when the vocal folds are relaxed. Vibrato is not something you "make" \u2014 it "appears" as a result of correct, tension-free phonation.',
    sensations: {
      0: 'The moment when your relaxed throat allows the sound to begin oscillating naturally',
      1: 'A comfortable feeling of the body vibrating on its own, without deliberate effort',
      2: 'A sense of warmth and vitality being added to the tone',
    },
    soundDescription:
      'A steady pitch that oscillates gently up and down in a regular pattern \u2014 about 5\u20136 cycles per second. This is different from tremolo (fast, irregular shaking).',
    mistakes: {
      0: {
        mistake: 'Shaking the jaw or tongue to force vibrato',
        fix: 'Keep your jaw and tongue still. Vibrato comes from the natural relaxation of the laryngeal muscles.',
      },
      1: {
        mistake: 'Shaking too fast (tremolo)',
        fix: 'First sustain a stable long tone for 5+ seconds, then gradually relax. Focus on releasing tension rather than slowing down.',
      },
      2: {
        mistake: 'Shaking too slowly and widely (wobble)',
        fix: 'Increase breath support. Insufficient diaphragmatic support causes the oscillation to become slow and wide.',
      },
      3: {
        mistake: 'No vibrato appears at all',
        fix: 'This is normal. Master humming and lip trills first; sustain a comfortable pitch for 5+ seconds and vibrato will emerge naturally.',
      },
    },
    levelTips: {
      1: 'Sustain a comfortable pitch for 5+ seconds and notice any oscillation.',
      2: 'Hold a stable vibrato in the 4\u20138 Hz range for 5 seconds.',
      3: 'Focus on vibrato regularity (periodicity above 50%).',
      4: 'Maintain consistent rate (5\u20137 Hz) and extent (50\u201380 cents) for 10 seconds.',
      5: 'Precise vibrato control \u2014 maintain consistent rate and extent for 15 seconds.',
    },
  },
  basic_dynamic: {
    description:
      'Gradually increasing volume (crescendo) or decreasing volume (decrescendo) while holding a single pitch. A preparatory exercise for messa di voce, building the foundation for controlling volume while maintaining pitch stability.',
    sensations: {
      0: 'A sensation of breath support from the belly gradually increasing or decreasing',
      1: 'The feeling that belly pressure changes, not throat tension, as volume grows',
      2: 'Confidence that pitch stays locked even as volume changes',
    },
    soundDescription:
      'Starting soft and growing louder, or starting loud and fading \u2014 all on one comfortable pitch. Only the volume should change; the pitch must remain constant.',
    mistakes: {
      0: {
        mistake: 'Pitch rises as volume increases',
        fix: 'Increase the "push from the belly" while keeping throat tension the same. Monitor your pitch line to verify.',
      },
      1: {
        mistake: 'Volume changes too suddenly',
        fix: 'Change gradually. Think of slowly pressing a car accelerator.',
      },
      2: {
        mistake: 'Voice cuts out at soft volumes',
        fix: 'Practice flow phonation thoroughly before attempting this exercise.',
      },
    },
    levelTips: {
      1: 'Practice soft\u2192loud or loud\u2192soft at a comfortable pitch. A 6 dB difference is enough.',
      2: 'Practice a gradual crescendo over 6 seconds.',
      3: 'Verify that pitch stays within 12 Hz during volume changes.',
      4: 'Perform a smooth crescendo spanning 12 dB over 10 seconds.',
      5: 'Practice both directions (crescendo + decrescendo) in preparation for messa di voce.',
    },
  },
  vfe: {
    description:
      'A four-part systematic vocal fold exercise protocol developed by Dr. Joseph Stemple. It comprehensively trains vocal fold endurance, flexibility, and balance \u2014 "physical therapy for the vocal folds."',
    sensations: {
      0: 'Exercise A: A pleasant fatigue as the vocal folds vibrate lightly and efficiently',
      1: 'Exercise B: A sensation of the vocal folds stretching (thinning) as pitch rises',
      2: 'Exercise C: A sensation of the vocal folds thickening as pitch descends',
      3: 'Exercise D: The vocal folds vibrating steadily and firmly at a low pitch',
    },
    soundDescription:
      'Exercise A: A very soft "ee\u2014" sound. Exercises B/C: A siren slowly gliding up or down. Exercise D: A soft, low "ol\u2014" sound. All performed very quietly.',
    mistakes: {
      0: {
        mistake: 'Volume is too loud',
        fix: 'Keep it "barely audible to the person next to you." The goal is duration, not volume.',
      },
      1: {
        mistake: 'Pitch breaks during glides',
        fix: 'Try at an even softer volume. The quieter you are, the smoother the transition.',
      },
      2: {
        mistake: 'Only doing it once a day',
        fix: 'Set a routine: 5 minutes after morning washing and 5 minutes before bed.',
      },
      3: {
        mistake: 'Pushing down for low notes in Exercise D',
        fix: 'Stop at the lowest pitch you can reach naturally. If the sound crackles (vocal fry), it is too low.',
      },
    },
    levelTips: {
      1: 'Learn all 4 exercises and perform each one twice.',
      2: 'Increase to twice daily (morning/evening) and log your sustained durations.',
      3: 'Aim to increase Exercise A duration by 2\u20133 seconds each week.',
      4: 'Exercise A 25 seconds+, overall stability score 75+.',
      5: 'Demonstrate consistent vocal fold control across all four exercises.',
    },
  },
  pitch_glide: {
    description:
      'Smoothly sliding your voice from low to high or high to low. A core exercise for expanding your range and achieving seamless register transitions (passaggio).',
    sensations: {
      0: 'Resonance in the chest at low pitches, shifting to face and head as you ascend',
      1: 'A slight instability at the register transition point (passaggio) \u2014 this decreases with practice',
      2: 'A continuous siren-like sensation of smooth ascending and descending',
    },
    soundDescription:
      'Like a fire engine siren slowly changing pitch in a continuous sweep. A slide, not stairs \u2014 the pitch must change without any breaks.',
    mistakes: {
      0: {
        mistake: 'Voice "cracks" at the register transition point',
        fix: 'Get softer at the break point. Never push through it with force.',
      },
      1: {
        mistake: 'Pitch moves in steps rather than a smooth glide',
        fix: 'Focus on the "siren" image. Practicing on lip trills first makes it easier.',
      },
      2: {
        mistake: 'Throat tightens at the highest pitch',
        fix: 'Get softer as you go higher. Do not exceed your comfortable range.',
      },
      3: {
        mistake: 'Going up/down too quickly',
        fix: 'Take 3\u20135 seconds for each sweep. Faster glides lead to more breaks.',
      },
    },
    levelTips: {
      1: 'Practice slow glides within a 5th, ascending and descending until the session ends.',
      2: 'Expand to one octave and practice round-trip sirens.',
      3: 'Target 1 or fewer pitch-line breaks.',
      4: 'Practice full-range glides (two octaves).',
      5: 'Achieve smooth transitions across the full range with no breaks at the passaggio.',
    },
  },
  messa: {
    description:
      'Sustaining a single pitch while starting very softly, gradually swelling to full volume, and then fading back to silence. The ultimate vocal control technique in classical singing \u2014 the final boss of vocal training.',
    sensations: {
      0: 'Quiet phase: The vocal folds vibrating delicately and lightly',
      1: 'Crescendo phase: Increasing breath support rising from the belly',
      2: 'Decrescendo phase: Gradually releasing the tension of the louder sound',
      3: 'Throughout the entire process, pitch must remain unchanged',
    },
    soundDescription:
      'Like a sound approaching from the distance, growing close, then receding again. A single violin note swelling from ppp to fff and fading back to ppp \u2014 an arched volume curve.',
    mistakes: {
      0: {
        mistake: 'Pitch rises as volume increases',
        fix: 'When increasing volume, add more "push from the belly" while keeping throat tension constant. Use HAMONI\'s pitch line display to correct.',
      },
      1: {
        mistake: 'Cannot start at pp (jumps straight to mf)',
        fix: 'Master flow phonation (Exercise 6) for soft onsets before attempting this.',
      },
      2: {
        mistake: 'Sound vanishes abruptly at the end of the decrescendo',
        fix: 'Practice the decrescendo separately \u2014 start at ff and reduce gradually to pp.',
      },
      3: {
        mistake: 'Tone is uneven with trembling',
        fix: 'Start with a narrow volume range (mp-mf-mp) and gradually widen it over time.',
      },
    },
    levelTips: {
      1: 'Start with a narrow range (mp-mf-mp) on one comfortable pitch, repeating until the session ends.',
      2: 'Widen the range (p-f-p) and practice 5-second crescendo / 5-second decrescendo.',
      3: 'Verify that the pitch line stays level throughout volume changes.',
      4: 'Full range (pp-ff-pp) at various pitches.',
      5: 'Achieve a smooth volume arch with perfect pitch stability, sustained for 12+ seconds.',
    },
  },
  breath_alloc: {
    description:
      'Sustaining a comfortable "ah\u2014" at a constant intensity. The goal is to distribute breath evenly from your belly so that volume remains stable from start to finish.',
    sensations: {
      0: 'A steady sensation of air leaving at a constant rate from your belly',
      1: 'The volume at the beginning and end feels the same \u2014 like level flight',
      2: 'Your abdominal muscles working evenly, not your throat',
    },
    soundDescription:
      'A constant-volume "ah\u2014" at a comfortable pitch. The volume meter should trace a horizontal line from start to finish. Steady enough that a candle flame would not flicker.',
    mistakes: {
      0: {
        mistake: 'Starting too forcefully',
        fix: 'Begin at a comfortable intensity you can maintain for the full duration. About 80% effort is ideal.',
      },
      1: {
        mistake: 'Volume drops sharply toward the end',
        fix: 'Gauge your remaining air in advance and maintain abdominal support until the very end.',
      },
      2: {
        mistake: 'Volume rises and falls like waves',
        fix: 'Maintain constant pressure from the belly through diaphragmatic breathing. Imagine air leaving a balloon at a steady rate.',
      },
      3: {
        mistake: 'Holding breath and pushing with force',
        fix: 'Release throat tension and let only the natural contraction of your abdomen push the air out.',
      },
    },
    levelTips: {
      1: 'Sustain as long as you can at a comfortable pitch, and repeat until the session ends.',
      2: 'Sustain for 12 seconds with an RMS coefficient of variation (CV) below 50%.',
      3: '16 seconds, CV below 35% \u2014 the volume meter should be nearly flat.',
      4: '20 seconds, CV below 25% \u2014 demonstrate highly stable airflow control.',
      5: '25+ seconds, CV below 18% \u2014 professional-level breath allocation.',
    },
  },
  sz_ratio: {
    description:
      'First sustain an "sss\u2014" as long as possible, then sustain a "zzz\u2014" as long as possible. Measuring the duration ratio of /s/ to /z/ is a clinical test that evaluates vocal fold function.',
    sensations: {
      0: '/s/ production: a "shh\u2014" sensation of air escaping between upper and lower teeth',
      1: '/z/ production: the same position with added vocal fold vibration \u2014 a "zzz\u2014" buzz',
      2: 'The difference between the two is vocal fold vibration \u2014 you can feel a buzz in your throat on /z/',
    },
    soundDescription:
      'First half is "sss\u2014\u2014\u2014" (voiceless fricative), second half is "zzz\u2014\u2014\u2014" (voiced fricative). Sustain both at a constant intensity as long as possible. A normal ratio is approximately 1.0.',
    mistakes: {
      0: {
        mistake: '/s/ and /z/ sounds are unclear',
        fix: 'Lightly bring your upper and lower teeth together and direct air through the gap. Touch your throat during /z/ to confirm vibration.',
      },
      1: {
        mistake: '/s/ sound ends too quickly',
        fix: 'Take a deep diaphragmatic breath, then push air out slowly from your belly. Do not rush the exhale.',
      },
      2: {
        mistake: 'Breathy quality during /z/ production',
        fix: 'This indicates the vocal folds are not fully closing. Practice humming first, then attempt /z/.',
      },
      3: {
        mistake: 'Long pause between /s/ and /z/',
        fix: 'Breathe in naturally between the two sounds and continue immediately.',
      },
    },
    levelTips: {
      1: 'Aim to sustain /s/ and /z/ each for at least 5 seconds.',
      2: 'Each 8+ seconds, target an S/Z ratio between 0.7 and 1.5.',
      3: 'Each 10+ seconds, ratio 0.8\u20131.3 \u2014 indicates healthy vocal fold function.',
      4: 'Each 12+ seconds, ratio 0.85\u20131.2 \u2014 precise vocal fold valve function.',
      5: 'Each 15+ seconds, ratio 0.9\u20131.15 \u2014 optimal vocal fold function ratio.',
    },
  },
  phrase_sim: {
    description:
      'Following a presented breathing pattern (sustain-rest-sustain). This simulates the phrase structure of actual singing or speaking, training efficient breath distribution across multiple phrases.',
    sensations: {
      0: 'A stable sensation of constant airflow during each phrase',
      1: 'Quick, natural breath replenishment during rest intervals',
      2: 'A sense of rhythm when chaining multiple phrases together',
    },
    soundDescription:
      '"Ah\u2014(sustain)\u2014(rest)\u2014ah\u2014(sustain)\u2014(rest)\u2014ah\u2014(sustain)" pattern. Volume should be uniform across all sustain segments, and rest intervals should be short and efficient.',
    mistakes: {
      0: {
        mistake: 'Using up all breath on the first phrase',
        fix: 'Survey the entire pattern first and plan how much breath each phrase needs.',
      },
      1: {
        mistake: 'Unable to inhale sufficiently during rest intervals',
        fix: 'Practice quick diaphragmatic inhalation. Using mouth and nose simultaneously allows faster intake.',
      },
      2: {
        mistake: 'Volume varies widely between phrases',
        fix: 'Match the starting volume of every phrase. Remember the loudness of the first note and replicate it.',
      },
      3: {
        mistake: 'Getting tangled and unable to follow the pattern',
        fix: 'First practice the pattern silently with breath alone, then add voicing.',
      },
    },
    levelTips: {
      1: 'Practice short phrases (2\u20133 second sustains), repeating until the session ends.',
      2: '15-second pattern, contour score of 40 or above.',
      3: '20-second pattern, contour score 55+ \u2014 focus on uniformity between phrases.',
      4: '25-second pattern, contour score 70+ \u2014 professional-level breath distribution.',
      5: '30-second pattern, contour score 80+ \u2014 complete phrase control mastery.',
    },
  },
  airflow_stable: {
    description:
      'Sustaining a single pitch as steadily as possible, minimizing all fluctuation. Similar to breath allocation, but here the focus is on eliminating even the tiniest airflow tremors.',
    sensations: {
      0: 'A sensation of extremely precise air control from your belly',
      1: 'The sound is a straight line with no wavering \u2014 like a laser beam',
      2: 'Your entire body supporting like a stable pillar',
    },
    soundDescription:
      'A perfectly steady "ah\u2014" at a comfortable pitch. On an oscilloscope, the amplitude should be as close to a flat line as possible.',
    mistakes: {
      0: {
        mistake: 'Subtle trembling (tremolo) mixed in',
        fix: 'Completely release throat tension. Most trembling originates from laryngeal tension.',
      },
      1: {
        mistake: 'Breath pushes out irregularly',
        fix: 'Place one hand on your belly and use the tactile feedback to ensure contraction speed stays constant.',
      },
      2: {
        mistake: 'Starting too loud or too soft',
        fix: 'A comfortable conversational volume is the easiest to sustain steadily.',
      },
      3: {
        mistake: 'Forcing duration by holding on too long',
        fix: 'Stop when stability wavers. The key is to gradually extend short but perfect segments.',
      },
    },
    levelTips: {
      1: 'Sustain as long as you can at a comfortable pitch, and repeat until the session ends.',
      2: '12 seconds, CV below 40% \u2014 focus on keeping airflow constant.',
      3: '18 seconds, CV below 28% \u2014 highly precise airflow control.',
      4: '22 seconds, CV below 20% \u2014 expert-level stability.',
      5: '28+ seconds, CV below 14% \u2014 top-tier airflow stability.',
    },
  },
  mpt: {
    description:
      'Sustaining "ah\u2014" as long as possible at a comfortable pitch. Maximum Phonation Time (MPT) is an important indicator that comprehensively reflects lung capacity and vocal fold function.',
    sensations: {
      0: 'Your belly working to maintain the sound as breath gradually diminishes',
      1: 'A feeling of "squeezing out the last drop" at the very end of the sound',
      2: 'A sense of accomplishment when you successfully sustain for a long time',
    },
    soundDescription:
      'A comfortable, natural "ah\u2014" sound for as long as possible. Do not strain to raise or lower the pitch \u2014 sustain your most comfortable pitch for maximum duration.',
    mistakes: {
      0: {
        mistake: 'Choosing a pitch too high or too low',
        fix: 'Select the pitch most comfortable during normal speech. Your comfortable pitch allows the longest sustain.',
      },
      1: {
        mistake: 'Excessive inhalation (filling lungs to maximum)',
        fix: 'Inhale only about 80%. Over-inflation actually tenses the vocal folds and reduces MPT.',
      },
      2: {
        mistake: 'Squeezing the throat to force the sound at the end',
        fix: 'Stop when the sound fades naturally. The point where voice quality deteriorates is your true MPT.',
      },
      3: {
        mistake: 'Using a different pitch each attempt',
        fix: 'Always measure at the same comfortable pitch for accurate comparison.',
      },
    },
    levelTips: {
      1: 'Sustain for 8+ seconds at a comfortable pitch. Female average is about 15 seconds; male average is about 20 seconds.',
      2: '12 seconds + HNR above 8 dB \u2014 maintain clean tone as you extend.',
      3: '18 seconds + HNR above 12 dB \u2014 stable vocal endurance.',
      4: '25 seconds + HNR above 15 dB \u2014 excellent lung capacity and vocal fold function.',
      5: '35+ seconds + HNR above 18 dB \u2014 top-tier vocal endurance.',
    },
  },
  register_blend: {
    description:
      'A slow, continuous pitch siren (glide up and down) through the register transition zone (passaggio). The goal is to smoothly connect chest voice and head voice without any breaks or cracks.',
    sensations: {
      0: 'A moment where your voice "shifts" at a certain pitch \u2014 that is the passaggio',
      1: 'No strain in the throat as the voice naturally "changes placement" through the transition',
      2: 'When done well, it feels like one seamless siren with no dividing line',
    },
    soundDescription:
      'A slow siren like "oo\u2014ee\u2014oo\u2014" gliding up and down. Similar to pitch glides, but the key is no breaks at the transition point.',
    mistakes: {
      0: {
        mistake: 'Voice "cracks" at a certain pitch (register break)',
        fix: 'Reduce volume slightly near the transition point. Transitioning is much easier at lower volume.',
      },
      1: {
        mistake: 'Suddenly flipping to falsetto on high notes',
        fix: 'Try opening your mouth more as you ascend and shift slightly from "ee" to "oo" vowel.',
      },
      2: {
        mistake: 'Squeezing the throat as you go higher',
        fix: 'Maintain the feeling of starting a yawn. The higher you go, the more relaxed you should be.',
      },
      3: {
        mistake: 'Going up too fast',
        fix: 'Slow down \u2014 very slowly. Aim for a siren that takes about 3 seconds to ascend.',
      },
    },
    levelTips: {
      1: 'Practice a half-octave siren in your comfortable range. Breaks are okay at this stage.',
      2: 'Find where your voice breaks and slowly slide back and forth around that point.',
      3: 'Reducing volume at the transition point helps smooth it out. Aim for 4 or fewer pitch breaks.',
      4: 'Pass through a one-octave siren with 3 or fewer breaks.',
      5: 'Over 1 octave, maintain HNR above 12 dB at all points throughout the siren.',
    },
  },
  passaggio_sustain: {
    description:
      'Sustaining a stable tone near the register transition point (passaggio). This exercise is about finding your "mixed voice" in the most unstable part of your range.',
    sensations: {
      0: 'A sound that is neither chest voice nor head voice \u2014 a "blended middle" feeling',
      1: 'Resonance felt simultaneously in both the chest and the head',
      2: 'Initially unstable, but gradually the voice "settles into place"',
    },
    soundDescription:
      'Sustain "ah\u2014" or "uh\u2014" about 3\u20134 notes higher than your comfortable speaking pitch. Not too heavy (chest) and not too light (falsetto) \u2014 a middle ground.',
    mistakes: {
      0: {
        mistake: 'Practicing at a comfortable pitch and missing the passaggio',
        fix: 'Choose a pitch that feels "uncomfortably high" \u2014 the point where chest voice alone cannot produce it easily.',
      },
      1: {
        mistake: 'Voice shakes or is unstable',
        fix: 'Reduce volume. In the passaggio, a soft sound stabilizes first.',
      },
      2: {
        mistake: 'Escaping into falsetto',
        fix: 'Maintain some "weight." Place your hand on your chest \u2014 if you feel a very faint vibration, you are on track.',
      },
      3: {
        mistake: 'Pushing through with force',
        fix: 'Maintain the open-throat sensation from the yawn-sigh exercise, then pause at the passaggio pitch.',
      },
    },
    levelTips: {
      1: 'Find your passaggio range. It is the pitch where your voice wants to crack as you ascend.',
      2: 'Hold the passaggio pitch as long as you can, and repeat until the session ends.',
      3: 'Improve stability: Jitter below 3.5%, HNR above 6 dB.',
      4: '6 seconds + F0 stability below 12 Hz \u2014 keep the pitch from wavering.',
      5: '8 seconds, HNR above 10 dB \u2014 your mixed voice is beginning to stabilize.',
    },
  },
  vowel_sustain: {
    description:
      'Sustaining an open vowel (ah, eh, ee, oh, oo) with maximum resonance. The goal is to produce the same rich vibration of humming, but with an open mouth.',
    sensations: {
      0: 'Vibrations felt around the nose and forehead even with the mouth open',
      1: 'A feeling of the sound "projecting forward"',
      2: 'Same volume but your voice carries further \u2014 an "efficient sound"',
    },
    soundDescription:
      'A clear, resonant "ah\u2014" sound. Rich in vibrations like humming, but with the mouth open. Like the sound reverberating in a cathedral. A voice that carries well even without a microphone.',
    mistakes: {
      0: {
        mistake: 'Yelling loudly to create resonance',
        fix: 'Resonance is about efficiency, not volume. Start at a moderate level.',
      },
      1: {
        mistake: 'Sound becomes overly nasal (hyper-nasality)',
        fix: 'If the sound changes significantly when you pinch your nose, it is hyper-nasal. Focus on frontal resonance instead.',
      },
      2: {
        mistake: 'Breathy and dull sound (low HNR)',
        fix: 'Start with humming to establish resonance, then very gradually open your mouth while maintaining the vibration.',
      },
      3: {
        mistake: 'Resonance only works on one vowel',
        fix: 'Start with the vowel that works best, then slowly transition to other vowels.',
      },
    },
    levelTips: {
      1: 'Sustain your easiest vowel (usually "ah") and repeat steadily until the session ends.',
      2: 'Start from a hum and open your mouth to achieve HNR above 8 dB.',
      3: 'Practice with all 5 vowels (ah, eh, ee, oh, oo) individually.',
      4: '8 seconds + HNR above 12 dB \u2014 true resonance begins.',
      5: '10 seconds + HNR above 15 dB \u2014 an efficient, projecting sound.',
    },
  },
  vowel_transition: {
    description:
      'Changing vowels while maintaining a single pitch: "ah\u2014eh\u2014ee\u2014oh\u2014oo\u2014" with pitch held steady and only the mouth shape changing. This trains you to maintain voice quality even as lyrics (vowels) change during singing.',
    sensations: {
      0: 'The "center" of the sound stays in the same place even as the mouth shape changes',
      1: 'Resonance shifts slightly for each vowel, but feels connected',
      2: 'Tongue and jaw move, but the throat stays relaxed and stable',
    },
    soundDescription:
      'On a single pitch, slowly cycle "ah\u2014eh\u2014ee\u2014oh\u2014oo\u2014". The sound should not break, the pitch should not change, and resonance should be maintained on every vowel.',
    mistakes: {
      0: {
        mistake: 'Pitch rises or falls when changing vowels',
        fix: 'Pitch tends to rise especially on "ee." Consciously maintain the same pitch throughout.',
      },
      1: {
        mistake: 'Sound cuts between vowels',
        fix: 'Do not stop voicing \u2014 only change the mouth shape slowly while the sound continues uninterrupted.',
      },
      2: {
        mistake: 'Sound thins out on "ee" or "oo"',
        fix: 'Maintain the open-throat sensation from "ah" on "ee" and "oo." Only the mouth changes, the throat stays the same.',
      },
      3: {
        mistake: 'Excessive jaw movement',
        fix: 'Use only the minimum jaw movement needed for vowel transitions. Tongue position matters more.',
      },
    },
    levelTips: {
      1: 'Practice 3-vowel transitions (ah\u2014eh\u2014ee) at a comfortable pitch.',
      2: 'Practice 5-vowel transitions (ah\u2014eh\u2014ee\u2014oh\u2014oo), keeping F0 within 15 Hz.',
      3: 'Focus on pitch stability: F0 below 12 Hz + HNR above 7 dB.',
      4: 'Increase transition speed: aim for about 2 seconds per vowel.',
      5: 'Maintain HNR above 12 dB on every vowel \u2014 resonance should not drop.',
    },
  },
} as const;

export default exerciseContent;
