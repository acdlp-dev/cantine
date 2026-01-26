<?php

use Slim\Http\Request;
use Slim\Http\Response;
use Stripe\Stripe;

$app->post('/pp', function (Request $request, Response $response, array $args) {   

  try{
    $fpIpn = fopen('log/ipntoohme.log', 'a');//opens file in append mode
    $ipn = $request->getBody();
    //$ipn ="mc_gross=1.00&protection_eligibility=Eligible&address_status=unconfirmed&payer_id=XAC9KSETEJ3E4&address_street=7+RUE+DE+LA+SENETTE&payment_date=06%3A52%3A17+Nov+19%2C+2020+PST&payment_status=Completed&charset=windows-1252&address_zip=78955&first_name=Rachidou&mc_fee=0.26&address_country_code=FR&address_name=RBF+Consulting&notify_version=3.9&payer_status=verified&business=aucoeurdelaprecarite_yahoo.fr&address_country=France&address_city=CARRIERES+SOUS+POISSY&verify_sign=AnUBOX9prCqk8jrecV7rTkPznM0pA0eFqdTxM.-lC7LtIK.KAlSeF067&payer_email=rachid.boulsane_rbfconsulting.fr&txn_id=9M0848222F249161E&payment_type=instant&payer_business_name=RBF+Consulting&last_name=BOULSANE&address_state=&receiver_email=aucoeurdelaprecarite_yahoo.fr&payment_fee=&receiver_id=HFMN42TDH7GW4&txn_type=send_money&mc_currency=EUR&residence_country=FR&transaction_subject=&payment_gross=&ipn_track_id=5a16947b1f37c";
    //$opn ="mc_gross=30.00&protection_eligibility=Eligible&address_status=confirmed&payer_id=X5FBKU5NP8ZHG&address_street=22+All%E9e+CAVALIERE&payment_date=05%3A06%3A25+Dec+20%2C+2020+PST&payment_status=Completed&charset=windows-1252&address_zip=91700&first_name=Toufig&mc_fee=0.67&address_country_code=FR&address_name=Toufig+TERCHOUNE&notify_version=3.9&subscr_id=I-U8P3USKSN5X5&payer_status=verified&business=aucoeurdelaprecarite_yahoo.fr&address_country=France&address_city=SAINTE+GENEVIEVE+DES+BOIS&verify_sign=AOaeF2VxxS76-YwpTScCFr9WXLLdA3uVNzXgTyYljyuf9euMTRjdj8j2&payer_email=toufig.terchoune_gmail.com&txn_id=6YH27090JE826892A&payment_type=instant&payer_business_name=Toufig+TERCHOUNE&last_name=TERCHOUNE&address_state=&receiver_email=aucoeurdelaprecarite_yahoo.fr&payment_fee=&receiver_id=HFMN42TDH7GW4&txn_type=subscr_payment&item_name=Don+r%E9gulier&mc_currency=EUR&residence_country=FR&transaction_subject=Don+r%E9gulier&payment_gross=&ipn_track_id=4a56c2081bee5";
    //$ipn = "mc_gross=1.00&protection_eligibility=Eligible&payer_id=XAC9KSETEJ3E4&payment_date=02%3A27%3A55+Jan+10%2C+2021+PST&payment_status=Completed&charset=UTF-8&first_name=Rachid&mc_fee=0.26&notify_version=3.9&custom=zzzfnauueezzzlnauueeezzzcamuuZakat+el+Maalzzzadduu102+rue+de+S%C3%A8vres%2C+Paris%2C+Francezzzcoduu75015zzzcituuPariszzzcouuuFrancezzzccouuFR&payer_status=verified&business=aucoeurdelaprecarite%40yahoo.fr&quantity=1&verify_sign=ASEOXq.iS7QCI5UDJ3vaVa8vkd2mAR.kPNW4Ka5lGrgvWmlu2dqo5cHP&payer_email=rachid.boulsane%40rbfconsulting.fr&txn_id=4PU28504NN2829842&payment_type=instant&payer_business_name=RBF+Consulting&last_name=BOULSANE&receiver_email=aucoeurdelaprecarite%40yahoo.fr&payment_fee=&shipping_discount=0.00&receiver_id=HFMN42TDH7GW4&insurance_amount=0.00&txn_type=web_accept&item_name=Pour+les+plus+d%C3%A9munis&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&shipping_method=Default&transaction_subject=__fna_ee__lna_eee__cam_Zakat+el+Maal__add_102+rue+de+S%C3%A8vres%2C+Paris%2C+France__cod_75015__cit_Paris__cou_France__cco_FR&payment_gross=&ipn_track_id=989b5c251a259";
    //$ipn = "mc_gross=1.00&protection_eligibility=Ineligible&payer_id=4D545QHBYYPTJ&payment_date=14%3A26%3A30+Feb+07%2C+2021+PST&payment_status=Completed&charset=UTF-8&first_name=rachid&mc_fee=0.26&notify_version=3.9&custom=z-zrecu-ufalsez-zfnau-urachidz-zlnau-uboulsz-zcamu-uZakat+Al+Maalz-zaddu-uz-zcodu-uz-zcitu-uz-zcouu-uz-zccou-u&payer_status=unverified&business=aucoeurdelaprecarite%40yahoo.fr&quantity=1&verify_sign=AopI0Kqmw9WM0Evd18r-eSDDl8yQAwD-KsfR2rS.k.nTdQrWqxyWlhBJ&payer_email=rachidboulsane%40gmail.com&txn_id=2PP52657KY158024R&payment_type=instant&last_name=boulsane&receiver_email=aucoeurdelaprecarite%40yahoo.fr&payment_fee=&shipping_discount=0.00&receiver_id=HFMN42TDH7GW4&insurance_amount=0.00&txn_type=web_accept&item_name=Pour+les+plus+d%C3%A9munis&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&receipt_id=1954-1340-6371-1429&shipping_method=Default&transaction_subject=z-zrecu-ufalsez-zfnau-urachidz-zlnau-uboulsz-zcamu-uZakat+Al+Maalz-zaddu-uz-zcodu-uz-zcitu-uz-zcouu-uz-zccou-u&payment_gross=&ipn_track_id=ef120281836f3";
    //$ipn="mc_gross=5.00&protection_eligibility=Eligible&payer_id=LCVW968S5PQC8&payment_date=17:05:41 May 11, 2021 PDT&payment_status=Completed&charset=UTF-8&first_name=Hanane&mc_fee=0.32&notify_version=3.9&custom=z-zrecu-utruez-zfnau-uHanane z-zlnau-uDali Ali z-zcamu-uFonds Générauxz-zaddu-u10 Rue Bartholdi, Boulogne-Billancourt, Francez-zcodu-u92100z-zcitu-uBoulogne-Billancourtz-zcouu-uFrancez-zccou-uFR&payer_status=verified&business=aucoeurdelaprecarite@yahoo.fr&quantity=1&verify_sign=AIU74I7tYtqM0TVFHEUS5g90pZZyAyi96orfj8ENxhkgARjWNQsJ-Th.&payer_email=rachidboulsane@gmail.com&txn_id=8AP17613SJ492924R&payment_type=instant&last_name=Nouri&receiver_email=aucoeurdelaprecarite@yahoo.fr&payment_fee=&shipping_discount=0.00&receiver_id=HFMN42TDH7GW4&insurance_amount=0.00&txn_type=web_accept&item_name=Pour les plus démunis&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&shipping_method=Default&transaction_subject=z-zrecu-utruez-zfnau-uHanane z-zlnau-uDali Ali z-zcamu-uFonds Générauxz-zaddu-u10 Rue Bartholdi, Boulogne-Billancourt, Francez-zcodu-u92100z-zcitu-uBoulogne-Billancourtz-zcouu-uFrancez-zccou-uFR&payment_gross=&ipn_track_id=a4a277f0149eb";
    //$ipn="transaction_subject=&txn_type=send_money&payment_date=14:11:17 Mar 27, 2022 PDT&last_name=TRAORE&residence_country=FR&payment_gross=&mc_currency=EUR&business=aucoeurdelaprecarite@yahoo.fr&payment_type=instant&protection_eligibility=Ineligible&verify_sign=AXC2.cDpT7P4Ppv6y6N9nhGDEMEKAShXlNY5T7jsktbOxP9hds9Kg2TT&payer_status=verified&payer_email=rachidboulsane@gmail.com&txn_id=2HH68867745995124&receiver_email=aucoeurdelaprecarite@yahoo.fr&first_name=Nami&payer_id=5DMUT7CLW9NFS&receiver_id=HFMN42TDH7GW4&payment_status=Completed&mc_gross=1.00&charset=UTF-8&notify_version=3.9&ipn_track_id=f561201e66689";
    //$ipn="mc_gross=1.00&protection_eligibility=Eligible&payer_id=XAC9KSETEJ3E4&payment_date=16:22:51 Mar 27, 2022 PDT&payment_status=Completed&charset=UTF-8&first_name=Rachid&mc_fee=0.26&notify_version=3.9&custom=z-zrecu-utruez-zfnau-uRachidz-zlnau-uBoulsanez-zcamu-uZakat Al Maalz-zaddu-u7 Rue de la Senettez-zcodu-u78955z-zcitu-uCarrières-sous-Poissyz-zcouu-uFrancez-zccou-uFRz-zsrcu-umyamana2&payer_status=verified&business=contact@aucoeurdelaprecarite.com&quantity=1&verify_sign=AJjtUEC2-zvkp.2Yz8a-.FGmZ2b3A6oTdm1QkwwGKct5Bzi1bLZ.HPEU&payer_email=rachid.boulsane@rbfconsulting.fr&txn_id=1W87528077439560P&payment_type=instant&payer_business_name=RBF Consulting&last_name=Boulsane&receiver_email=contact@aucoeurdelaprecarite.com&payment_fee=&shipping_discount=0.00&receiver_id=MFDNPHE4DEYJJ&insurance_amount=0.00&txn_type=web_accept&item_name=Une aide pour les plus démunis&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&shipping_method=Default&transaction_subject=z-zrecu-utruez-zfnau-uRachidz-zlnau-uBoulsanez-zcamu-uZakat Al Maalz-zaddu-u7 Rue de la Senettez-zcodu-u78955z-zcitu-uCarrières-sous-Poissyz-zcouu-uFrancez-zccou-uFRz-zsrcu-umyamana&payment_gross=&ipn_track_id=f884430ddeb55";
    //$ipn="mc_gross=1.00&protection_eligibility=Eligible&payer_id=XAC9KSETEJ3E4&payment_date=05%3A54%3A41+Sep+23%2C+2023+PDT&payment_status=Completed&charset=UTF-8&first_name=Rachid&mc_fee=0.26&notify_version=3.9&custom=z-zrecu-utruez-zfnau-urachidz-zlnau-uboulsanez-zcamu-uACMPz-zaddu-u7+Rue+de+la+Senettez-zcodu-u78955z-zcitu-uCarri%C3%A8res-sous-Poissyz-zcouu-uFrancez-zccou-uFRz-zsrcu-umyamana&payer_status=verified&business=jaouad.boukhiar%40acmp.one&quantity=1&verify_sign=AKIzN8O8SX--9kC2Xx2x7xs1eIj5AhihMBVYlz.5oY3rq2Cx4XMD9Ps2&payer_email=rachid.boulsane%40rbfconsulting.fr&txn_id=5C218911GX1706210&payment_type=instant&payer_business_name=RBF+Consulting&last_name=Boulsane&receiver_email=jaouad.boukhiar%40acmp.one&payment_fee=&shipping_discount=0.00&receiver_id=RPT3AZBPZCHGC&insurance_amount=0.00&txn_type=web_accept&item_name=Association+cultuelle&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&shipping_method=Default&transaction_subject=z-zrecu-utruez-zfnau-urachidz-zlnau-uboulsanez-zcamu-uACMPz-zaddu-u7+Rue+de+la+Senettez-zcodu-u78955z-zcitu-uCarri%C3%A8res-sous-Poissyz-zcouu-uFrancez-zccou-uFRz-zsrcu-umyamana&payment_gross=&ipn_track_id=f41333857a9d1";
    //$ipn = "mc_gross=20.00&protection_eligibility=Ineligible&payer_id=XF6JPCYVKRJXS&payment_date=06%3A32%3A54+Oct+04%2C+2023+PDT&payment_status=Completed&charset=UTF-8&first_name=Yassine&mc_fee=0.53&notify_version=3.9&custom=z-zrecu-utruez-zfnau-uyassz-zlnau-uFthz-zcamu-uadhesionz-zaddu-u5+Rue+de+Verneuilz-zcodu-u75006z-zcitu-uParisz-zcouu-uFrancez-zccou-uFRz-zsrcu-umyamana&payer_status=verified&business=aucoeurdelaprecarite%40yahoo.fr&quantity=1&verify_sign=AJNToUO45e9kLOTlLpVzI198s-T0ADlsdKtkGI5vqKRRrZQiOK5dSVLB&payer_email=yassinesw92%40gmail.com&txn_id=8BB98821X6566230U&payment_type=instant&last_name=Fathi&receiver_email=aucoeurdelaprecarite%40yahoo.fr&payment_fee=&shipping_discount=0.00&receiver_id=HFMN42TDH7GW4&insurance_amount=0.00&txn_type=web_accept&item_name=Une+aide+pour+les+plus+d%C3%A9munis&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&receipt_id=1635-2915-3909-5139&shipping_method=Default&transaction_subject=z-zrecu-utruez-zfnau-uyassz-zlnau-uFthz-zcamu-uadhesionz-zaddu-u5+Rue+de+Verneuilz-zcodu-u75006z-zcitu-uParisz-zcouu-uFrancez-zccou-uFRz-zsrcu-umyamana&payment_gross=ipn_track_id=f6415948e1d08";
    //$ipn="mc_gross=1.00&protection_eligibility=Eligible&payer_id=XAC9KSETEJ3E4&payment_date=08%3A20%3A07+Sep+23%2C+2023+PDT&payment_status=Completed&charset=UTF-8&first_name=Rachid&mc_fee=0.26&notify_version=3.9&custom=z-zrecu-utruez-zfnau-urachidz-zlnau-uboulsanez-zcamu-uACMPz-zaddu-u7+Rue+de+la+Senettez-zcodu-u78955z-zcitu-uCarri%C3%A8res-sous-Poissyz-zcouu-uFrancez-zccou-uFRz-zsrcu-umyamana&payer_status=verified&business=jaouad.boukhiar%40acmp.one&quantity=1&verify_sign=A5DvvBHIfnmYmgizLHOfiYBRqtDXAi7ll.rSr3K2rxv1uc-Mipkn0lO8&payer_email=rachid.boulsane%40rbfconsulting.fr&txn_id=9A407027YX592730B&payment_type=instant&payer_business_name=RBF+Consulting&last_name=Boulsane&receiver_email=jaouad.boukhiar%40acmp.one&payment_fee=&shipping_discount=0.00&receiver_id=RPT3AZBPZCHGC&insurance_amount=0.00&txn_type=web_accept&item_name=Association+cultuelle&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&shipping_method=Default&transaction_subject=z-zrecu-utruez-zfnau-urachidz-zlnau-uboulsanez-zcamu-uACMPz-zaddu-u7+Rue+de+la+Senettez-zcodu-u78955z-zcitu-uCarri%C3%A8res-sous-Poissyz-zcouu-uFrancez-zccou-uFRz-zsrcu-umyamana&payment_gross=&ipn_track_id=f579589c0b61f";
    //$ipn="mc_gross=20.00&protection_eligibility=Eligible&payer_id=XAC9KSETEJ3E4&payment_date=14%3A58%3A10+Oct+09%2C+2023+PDT&payment_status=Completed&charset=UTF-8&first_name=Rachid&mc_fee=0.53&notify_version=3.9&custom=z-zrecu-utruez-zfnau-uRachidz-zlnau-uBoulsanez-zcamu-uadhesionz-zaddu-u7+Rue+de+Panamaz-zcodu-u75018z-zcitu-uParisz-zcouu-uFrancez-zccou-uFRz-zsrcu-umyamana&payer_status=verified&business=jaouad.boukhiar%40acmp.one&quantity=1&verify_sign=Avy.IbsMU3P61Gpo8BJJNpgXDgt-AA0Fl.KEhr6g34CrH6ZeCYFIvYkV&payer_email=rachid.boulsane%40rbfconsulting.fr&txn_id=0KE44576D4182114X&payment_type=instant&payer_business_name=RBF+Consulting&last_name=Boulsane&receiver_email=jaouad.boukhiar%40acmp.one&payment_fee=&shipping_discount=0.00&receiver_id=RPT3AZBPZCHGC&insurance_amount=0.00&txn_type=web_accept&item_name=Association+cultuelle&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&shipping_method=Default&transaction_subject=z-zrecu-utruez-zfnau-uRachidz-zlnau-uBoulsanez-zcamu-uadhesionz-zaddu-u7+Rue+de+Panamaz-zcodu-u75018z-zcitu-uParisz-zcouu-uFrancez-zccou-uFRz-ztelu-u0625139585z-zsrcu-umyamana&payment_gross=&ipn_track_id=f512054f67444";
    //Adha La ruée
    //$ipn="mc_gross=1.00&protection_eligibility=Eligible&payer_id=HFMN42TDH7GW4&payment_date=04%3A18%3A03+May+13%2C+2024+PDT&payment_status=Completed&charset=windows-1252&first_name=Rachid&mc_fee=0.26&notify_version=3.9&custom=z-zrecu-ufalsez-zfnau-urachidz-zlnau-uboulsanez-zcamu-uAdhaz-zaddu-u+z-zcodu-uz-zcitu-uz-zcouu-uz-zccou-uz-ztelu-u0625139585z-zsrcu-umyamana&payer_status=verified&business=larueeversleau%40gmail.com&quantity=1&verify_sign=Acjjkx22dcI0r-g8xOS0gDwWtBVUApfrkI3iU9b4EWUQH43KiRLWIl.Q&payer_email=aucoeurdelaprecarite%40yahoo.fr&txn_id=5WD48330NN9425707&payment_type=instant&payer_business_name=Au+Coeur+de+la+Pr%E9carit%E9&last_name=Boulsane&receiver_email=larueeversleau%40gmail.com&payment_fee=&shipping_discount=0.00&receiver_id=RQEJ3V8HMMHKN&insurance_amount=0.00&txn_type=web_accept&item_name=Une+eau-m%F4ne&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&shipping_method=Default&transaction_subject=z-zrecu-ufalsez-zfnau-urachidz-zlnau-uboulsanez-zcamu-uAdhaz-zaddu-u+z-zcodu-uz-zcitu-uz-zcouu-uz-zccou-uz-ztelu-u0625139585z-zsrcu-umyamana&payment_gross=&ipn_track_id=f8415181178cd";
    //Adha Arbre
    //$ipn="mc_gross=25.00&protection_eligibility=Eligible&payer_id=HFMN42TDH7GW4&payment_date=04%3A18%3A03+May+13%2C+2024+PDT&payment_status=Completed&charset=windows-1252&first_name=Rachid&mc_fee=0.26&notify_version=3.9&custom=z-zrecu-utruez-zfnau-urachidz-zlnau-uboulsanez-zcamu-uPlantez%20un%20arbrez-zaddu-u+z-zcodu-uz-zcitu-uz-zcouu-uz-zccou-uz-ztelu-u0625139585z-zsrcu-umyamana&payer_status=verified&business=larueeversleau%40gmail.com&quantity=1&verify_sign=Acjjkx22dcI0r-g8xOS0gDwWtBVUApfrkI3iU9b4EWUQH43KiRLWIl.Q&payer_email=aucoeurdelaprecarite%40yahoo.fr&txn_id=5WD48330NN9425707&payment_type=instant&payer_business_name=Au+Coeur+de+la+Pr%E9carit%E9&last_name=Boulsane&receiver_email=larueeversleau%40gmail.com&payment_fee=&shipping_discount=0.00&receiver_id=RQEJ3V8HMMHKN&insurance_amount=0.00&txn_type=web_accept&item_name=Une+eau-m%F4ne&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&shipping_method=Default&transaction_subject=z-zrecu-utruez-zfnau-urachidz-zlnau-uboulsanez-zcamu-uAdhaz-zaddu-u+z-zcodu-uz-zcitu-uz-zcouu-uz-zccou-uz-ztelu-u0625139585z-zsrcu-umyamana&payment_gross=&ipn_track_id=f8415181178cd";
    //$ipn="mc_gross=129.00&protection_eligibility=Eligible&payer_id=6WRMYVEMQTF7J&payment_date=06%3A16%3A47+Jun+09%2C+2024+PDT&payment_status=Completed&charset=windows-1252&first_name=cedric&mc_fee=2.06&notify_version=3.9&custom=z-zrecu-utruez-zfnau-uC%E9dricz-zlnau-uWattrelotz-zcamu-uAdhaz-zaddu-u13+Rue+Moussonz-zcodu-u33140z-zcitu-uVillenave-d%27Ornonz-zcouu-uFrancez-zccou-uFRz-ztelu-u0768797771z-zarbu-uz-zsrcu-umyamana&payer_status=verified&business=yassinesw92%40gmail.com&quantity=1&verify_sign=AXs1iwVX2y5zBzWmL4Ff52yNoHgXAcPatvMmakDy5e0Egruo1BBcGI3o&payer_email=yassinesw92%40gmail.com&txn_id=63D26754TY4541839&payment_type=instant&last_name=Wattrelot&receiver_email=yassinesw92%40gmail.com&payment_fee=&shipping_discount=0.00&receiver_id=RQEJ3V8HMMHKN&insurance_amount=0.00&txn_type=web_accept&item_name=Soutien+aux+plus+d%E9munis&discount=0.00&mc_currency=EUR&item_number=&residence_country=FR&shipping_method=Default&transaction_subject=z-zrecu-utruez-zfnau-uC%E9dricz-zlnau-uWattrelotz-zcamu-uAdhaz-zaddu-u13+Rue+Moussonz-zcodu-u33140z-zcitu-uVillenave-d%27Ornonz-zcouu-uFrancez-zccou-uFRz-ztelu-u0768797771z-zarbu-uz-zsrcu-umyamana&payment_gross=&ipn_track_id=f292345fc30f1";
    
    //$ipn="insurance_amount=0.00&discount=0.00&transaction_subject=z-zrecu-ufalsez-zfnau-uNATIQz-zlnau-uIlyasz-zcamu-uPlantez+un+arbrez-zaddu-u+z-zcodu-uz-zcitu-uz-zcouu-uz-zccou-uz-ztelu-u0636481184z-zarbu-uHajj+AGUEDID+Abdallah%2C+MOUSTACHE+Fatna%2C+AGUEDID+Nezha%2C+NATIQ+Ilyas%2C+NATIQ+In%E8s%2C+RIANI+Amjad%2C+RIANI+Amine%2C+AGUEDID+Na%EFma%2C+Hajj+Moustapha%2C+Khali+Hmed%2C+Tous+les+musulmans%2C+En+Hommage+%E0+Palestine%2C+Ne+d%E9sesperez+pas+de+la+mis%E9ricorde+d%27Allah%2C+Invoquez+pour+moi+%28Ilyas%29%2C+ma+m%E8re+et+ma+famille%2C+Au+nom+d%27Allah%2C+Ar-Rahman%2C+Ar-Rahimz-zsrcu-umyamana&txn_type=web_accept&payment_date=14%3A56%3A57+Oct+04%2C+2024+PDT&last_name=NATIQ&residence_country=FR&pending_reason=other&shipping_method=Default&item_name=Soutien+aux+plus+d%E9munis&payment_gross=&mc_currency=EUR&business=larueeversleau%40gmail.com&payment_type=instant&protection_eligibility=Eligible&verify_sign=AtiqDFhMy5tTNH6i5Llq1hUJJH.YAGQt8DEnNLMH4w.02DhmXIambBB4&payer_status=verified&payer_email=rachidboulsane%40gmail.com&txn_id=2T940273EC630060J&quantity=1&receiver_email=larueeversleau%40gmail.com&first_name=Ilyas&payer_id=NFQHZR3AGQHYE&receiver_id=RQEJ3V8HMMHKN&item_number=&payment_status=Pending&mc_gross=375.00&custom=z-zrecu-ufalsez-zfnau-uNATIQz-zlnau-uIlyasz-zcamu-uPlantez+un+arbrez-zaddu-u+z-zcodu-uz-zcitu-uz-zcouu-uz-zccou-uz-ztelu-u0636481184z-zarbu-uHajj+AGUEDID+Abdallah%2C+MOUSTACHE+Fatna%2C+AGUEDID+Nezha%2C+NATIQ+Ilyas%2C+NATIQ+In%E8s%2C+RIANI+Amjad%2C+RIANI+Amine%2C+AGUEDID+Na%EFma%2C+Hajj+Moustapha%2C+Khali+Hmed%2C+Tous+les+musulmans%2C+En+Hommage+%E0+Palestine%2C+Ne+d%E9sesperez+pas+de+la+mis%E9ricorde+d%27Allah%2C+Invoquez+pour+moi+%28Ilyas%29%2C+ma+m%E8re+et+ma+famille%2C+Au+nom+d%27Allah%2C+Ar-Rahman%2C+Ar-Rahimz-zsrcu-umyamana&charset=windows-1252&notify_version=3.9&shipping_discount=0.00&ipn_track_id=f20700146b394";
    $exploded_array1 = explode('&', $ipn);
    $montant=null;
    $payment_date=null;
    $payment_status=null;
    $payment_type=null;
    $address_street=null;
    $address_zip=null;
    $address_city=null;
    $address_country=null;
    $postal_code=null;
    $payer_email=null;
    $first_name=null;
    $last_name=null;
    $rec=null;
    $txn_id=null;
    $campagne=null;
    $custom=null;
    $src=null;
    $arbre=null;
    $addJSON=[];
    $conJSON=[];
    $payJSON=[];
    $jsonArrayResponse=[];
    $conIdJSON=[];
    $txn_type=[];
    $business=null;
    $tel=null;
    $nomArbre=null;
  
    foreach ($exploded_array1 as $key => $element)
    {
      
      $exploded_array2 = explode('=', $element);
      switch($exploded_array2[0]) {
        case "first_name":
          $first_name=urldecode($exploded_array2[1]);
          $first_name = mb_convert_encoding($first_name, 'UTF-8', 'ISO-8859-1');
          break;
        case "last_name":
          $last_name=urldecode($exploded_array2[1]);
          $last_name = mb_convert_encoding($last_name, 'UTF-8', 'ISO-8859-1');
          break;
        case "mc_gross":
          $montant=urldecode($exploded_array2[1]);
          break;
        case "payment_date":
          $payment_date=urldecode($exploded_array2[1]);
          break;
        case "payment_status":
          $payment_status=urldecode($exploded_array2[1]);
          break;
        case "payment_type":
          $payment_type=urldecode($exploded_array2[1]);
          break;
        case "address_street":
          $address_street=urldecode($exploded_array2[1]);
          $address_street = mb_convert_encoding($address_street, 'UTF-8', 'ISO-8859-1');
          break;
        case "address_zip":
          $address_zip=urldecode($exploded_array2[1]);
          $address_zip = mb_convert_encoding($address_zip, 'UTF-8', 'ISO-8859-1');
          break;
        case "address_city":
          $address_city=urldecode($exploded_array2[1]);
          $address_city = mb_convert_encoding($address_city, 'UTF-8', 'ISO-8859-1');
          break;
        case "address_country":
          $address_country=urldecode($exploded_array2[1]);
          $address_country = mb_convert_encoding($address_country, 'UTF-8', 'ISO-8859-1');
          break;
        case "address_country_code":
          $postal_code=urldecode($exploded_array2[1]);
          break;
        case "payer_email":
          $payer_email=urldecode($exploded_array2[1]);
          $payer_email = mb_convert_encoding($payer_email, 'UTF-8', 'ISO-8859-1');
          break;
        case "txn_id":
          $txn_id=urldecode($exploded_array2[1]);
          break;
        case "custom":
          $custom=urldecode($exploded_array2[1]);
          break;
        case "txn_type":
          $txn_type=urldecode($exploded_array2[1]);
          break;
        case "business":
          $business=urldecode($exploded_array2[1]);
          break;
        default:
        break;
      }
  
    }
  
    if($custom !== "") {
      if (strpos($custom, 'Centrale') !== false) {
        return $response->withJson([ 'status' => 'success' ])->withStatus(200);
      } else {
        $exploded_array3 = explode('z-z', $custom);
        foreach ($exploded_array3 as $key => $element3)
        {           
          $exploded_array4 = explode('u-u', $element3);
          switch($exploded_array4[0]) {
            case "cam":
              $campagne=urldecode($exploded_array4[1]);
              $campagne = mb_convert_encoding($campagne, 'UTF-8', 'ISO-8859-1');
              break;
            case "add":
              $address_street=urldecode($exploded_array4[1]);
              $address_street = mb_convert_encoding($address_street, 'UTF-8', 'ISO-8859-1');
              break;
            case "cod":
              $address_zip=urldecode($exploded_array4[1]);
              $address_zip = mb_convert_encoding($address_zip, 'UTF-8', 'ISO-8859-1');
              break;
            case "cit":
              $address_city=urldecode($exploded_array4[1]);
              $address_city = mb_convert_encoding($address_city, 'UTF-8', 'ISO-8859-1');
              break;
            case "cou":
              $address_country=urldecode($exploded_array4[1]);
              $address_country = mb_convert_encoding($address_country, 'UTF-8', 'ISO-8859-1');
              break;
            case "cco":
              $postal_code=urldecode($exploded_array4[1]);
              break;           
            case "fna":
              $first_name=rtrim(urldecode($exploded_array4[1]));
              $first_name = mb_convert_encoding($first_name, 'UTF-8', 'ISO-8859-1');
              break;
            case "lna":
              $last_name=rtrim(urldecode($exploded_array4[1]));
              $last_name = mb_convert_encoding($last_name, 'UTF-8', 'ISO-8859-1');
              break;
            case "rec":
              $rec=urldecode($exploded_array4[1]);
              break;
            case "src":
              $src=urldecode($exploded_array4[1]);
              break;
            case "arb":
              $nomArbre=urldecode($exploded_array4[1]);
              $nomArbre = mb_convert_encoding($nomArbre, 'UTF-8', 'ISO-8859-1');
              break;
            case "tel":
              $tel=urldecode($exploded_array4[1]);
              break;
            case "arb":
              $nomArbre=urldecode($exploded_array4[1]);
              $nomArbre = mb_convert_encoding($nomArbre, 'UTF-8', 'ISO-8859-1');
              break;
            default:
              break;
          }
        }
      }
    }

    fwrite($fpIpn, "\n\n");
    fwrite($fpIpn, "############################ SOURCE " . $src . " ASSO " . $business . " DEBUT TRANSACTION " . $txn_id . " ###############################");
    fwrite($fpIpn, "\n\n");
    fwrite($fpIpn, "***************IPN RECU*** " . strftime('%d/%m/%y %H:%M') ." ***************");
    fwrite($fpIpn, "\n\n");
    fwrite($fpIpn, $src);
    fwrite($fpIpn, "\n".$ipn."\n");

    
    if($campagne=="maal"){
      $sql="SELECT * FROM Assos where paypal_email_zakat='$business' limit 1";
    } else {
      $sql="SELECT * FROM Assos where paypal_email='$business' limit 1";
    }
    $assoBdd = selectdb($sql,"mensuel.php-create-customer-subscription");
    $asso= $assoBdd[0]["uri"];
    $demande_adresse = $assoBdd[0]["demande_adresse"];
    $asso_recu = $assoBdd[0]["recu"];
    if($src != "myamana"){
      throw new Exception(' Paiement Paypal hors myamana');
    }
     //Ajout des logs curl
    //curl_setopt($cURLConnectionContact, CURLOPT_VERBOSE, true);
    //$verbose = fopen('curl.log', 'w+');
    //curl_setopt($cURLConnectionContact, CURLOPT_STDERR, $verbose);
    if($campagne != "") {
      $amana = $campagne;
    } else {
      $amana = "Fonds Généraux";
    }
    $type="ponctuel";
    if($txn_type == "subscr_payment") {
      $type="mensuel";
      $sql2 ="update Personnes set dernierPaiement=current_date, montant=\"".$montant."\" , asso=\"".$business."\" ,source=\"site\", moyen = \"PAYPAL\" where email in ('" . $payer_email ."')";
      fwrite($fpIpn, "Execution de la requête " . $sql2 . "\n");
      upsert($sql2,"paypal_webservice.php/pp-Personnes");     
    }

    //17:05:41 May 11, 2021 PDT
    $datePayment = new DateTime();
    $datePayment = $datePayment->createFromFormat('H:i:s F d\, Y T', $payment_date);
    $datePayment->setTimezone(new DateTimeZone('UTC'));
    $datePayment = strtotime($datePayment->format('Y-m-d H:i:s'));
    $filename="";
    if($rec==="true" || ($demande_adresse === "mandatory" && $asso_recu === "true")){
      $uriAsso=$assoBdd[0]["uri"];
      $signatairePrenomAsso= $assoBdd[0]["signataire_prenom"];
      $signataireNomAsso= $assoBdd[0]["signataire_nom"];
      $signataireSignAsso= $assoBdd[0]["signataire_signature"];
      $signataireRoleAsso= $assoBdd[0]["signataire_role"];
      $nomAsso= $assoBdd[0]["nom"];
      $adresseAsso= $assoBdd[0]["adresse"];
      $cpAsso= $assoBdd[0]["code_postal"];
      $villeAsso= $assoBdd[0]["ville"];
      $typeAsso= $assoBdd[0]["type"];
      $qualiteAsso= $assoBdd[0]["qualite"];
      $objetAsso= $assoBdd[0]["objet"];
      $logoAsso= $assoBdd[0]["logoUrl"];
      $contactAsso = $assoBdd[0]["email"];
      $isMosquee = $assoBdd[0]["isMosquee"];
      if ($amana == "adhesion"){
        $filename=adhesionPdf($first_name,$last_name,$address_street,$postal_code,$address_city,$nomAsso,$logoAsso,$adresseAsso,$villeAsso,$cpAsso,$contactAsso);
      }else {
        $filename = recuFiscal($first_name, $last_name, $payer_email, $address_street, $raison, $siren, $address_city, $address_zip, $montant, $type, $datePayment, "PAYPAL","ponctuel",$uriAsso,$signatairePrenomAsso,$signataireNomAsso,$signataireSignAsso,$signataireRoleAsso,$nomAsso,$adresseAsso,$cpAsso,$villeAsso,$typeAsso,$qualiteAsso,$objetAsso,$logoAsso);
      }
    }
    if($filename===""){
      $variables["lienRecu"]="";
    } else {
      $variables["lienRecu"]="Vous trouverez votre recu fiscal en cliquant <a href=$filename>ici</a>";
    }
    if($isMosquee==="oui"){
      $variables["campagne"]="";
    } else {
      $variables["campagne"]="Conformément à votre souhait ce don sera utilisé pour notre campagne ".$amana;
    }

    if($amana== "adhesion"){
      $adhesionYear= "2024";
      $template="adhesion";
      $subject= "Confirmation de votre adhésion";
      $variables["adhesionYear"]=$adhesionYear;
      $variables["prenom"]=$first_name; 
      $variables["lienCarte"]="Vous trouverez votre carte d'adhérent en cliquant <a href=$filename>ici</a>";
      $variables["monAsso"]=$uriAsso;
      $url=getenv('URL_FINALISATION/');
      //$variables["logoUrl"]= $url.$assoBdd[0]["logoUrl"];
      $variables["logoUrl"]= "https://www.myamana.fr/assets/images/acmp.png";
      if($asso ==="mosquee-ar-rahma"){
        $variables["logoUrl"]= "https://www.myamana.fr/assets/images/arahma.png";
      }

      $variables["codeCouleur"]= $assoBdd[0]["codeCouleur"];
      sendEmailDonator($asso,$payer_email, $template, $subject, $variables,null);
    } elseif($amana== "Adha" && $asso=="la-ruee-vers-l-eau"){
      //Envoie du mail au partenaire
      $nbSacrifices=(int)$montant / 129;
      $template="adhaRuee";
      $subject= "Nouvelle commande - " . $prenom . " " . $nom . " " . $nbSacrifices . " sacrifices ";
      $variables["prenom"]=$first_name; 
      $variables["nom"]=$last_name;
      $variables["telephone"]=$tel;
      $variables["nb_sacrifices"]=$nbSacrifices;
      sendEmailDonator($asso,"tsiorinirinafanie@gmail.com", $template, $subject, $variables,null);

      $variables=[];
      $variables["campagne"] = "Conformément à votre souhait ce don sera utilisé pour notre campagne ".$amana;


      //Envoie du mail au donateur 
      $template="ponctuel";
      $subject="Confirmation de votre don ponctuel";
      $variables["prenom"]=$first_name;
      $variables["montant"]=$montant;
      if($demande_recu==="true" || ($demande_adresse === "mandatory" && $asso_recu === "true")){
        $variables["lienRecu"]="Vous trouverez votre recu fiscal en cliquant <a href=$filename>ici</a>";
      } else {
        $variables["lienRecu"]="";
      }
      sendEmailDonator($asso,$payer_email,$template, $subject, $variables,null);
    }elseif($amana== "Plantez un arbre"){ 
      //Envoie du mail au donateur 
      $template="ponctuel";
      $subject="Confirmation de votre don ponctuel";
      $variables["prenom"]=$first_name;
      $variables["montant"]=$montant;
      if($demande_recu==="true" || ($demande_adresse === "mandatory" && $asso_recu === "true")){
        $variables["lienRecu"]="Vous trouverez votre recu fiscal en cliquant <a href=$filename>ici</a>";
      } else {
        $variables["lienRecu"]="";
      }
      sendEmailDonator($asso,$payer_email,$template, $subject, $variables,null);

      $variables=[];

      //Envoie du mail au partenaire
      $nbArbres=(int)$montant / 25;
      $template="arbre";
      $subject= "Nouvelle commande - " . $prenom . " " . $nom . " " . $nbArbres . " arbres";
      $variables["prenom"]=$first_name; 
      $variables["nom"]=$last_name;
      $variables["telephone"]=$tel;
      $variables["nb_arbres"]=$nbArbres;
      $variables["noms_arbres"]=$nomArbre;
      sendEmailDonator($asso,"tsiorinirinafanie@gmail.com", $template, $subject, $variables,null);
    }else {
      //Envoi de l'email de confirmation au donateur
      $template="ponctuel";
      $subject="Confirmation de votre don " . $type;
      $variables["prenom"]=$first_name;
      $variables["montant"]=$montant;
      //$variables["campagne"]=$amana;
      sendEmailDonator($asso, $payer_email,$template, $subject, $variables, null);
    }
    
    
    fwrite($fpIpn, "\n\n");
    fwrite($fpIpn, "***************Update BDD Donateurs ponctuels******************");
    fwrite($fpIpn, "\n\n");
    $sql3 ="insert into Dons_Ponctuels(asso,type,nom,prenom,montant,adresse,code_postal,ville,pays,tel,email,source,amana,demande_recu,moyen,lien_recu,tracking,nomArbre) values(\"$asso\",\"$type\",\"$last_name\",\"$first_name\",\"$montant\",\"$address_street\",\"$address_zip\",\"$address_city\",\"$address_country\",\"$tel\",\"$payer_email\",\"site\",\"$amana\",\"$rec\",\"Paypal\",\"$filename\",\"$amana\",\"$nomArbre\")";    
    upsert($sql3,"paypal_webservice.php/pp-Dons_Ponctuels");
    fwrite($fpIpn, "############################ FIN TRANSACTION " . $txn_id . " ###############################");
  }
  catch(Throwable $ex)
  {
    if($src != "myamana"){
      return "nn";
    }else {
    fwrite($fpIpn, "error :" . $ex->getMessage());
    $fperror= fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $message = str_replace("'", " ", $message);
    $sql ="INSERT into Erreurs (asso,message,fonction,event,eventType) values ('$asso','$message','paypal_webservice.php/pp','$txn_id','$txn_type')";
    upsert($sql,"paypal_webservice.php/pp");
    fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
    }
    
  }
  fclose($fpIpn);  

  return $response->withJson([ 'status' => 'success' ])->withStatus(200);
  });