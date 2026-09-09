(() => {
  const googleAnalyticsId = document.documentElement.dataset.googleAnalyticsId;

  const updateGoogleAnalyticsState = () => {
    if (!googleAnalyticsId) {
      return;
    }

    window[`ga-disable-${googleAnalyticsId}`] = !CookieConsent.acceptedCategory('analytics');
  };

  CookieConsent.run({
    mode: 'opt-in',
    revision: 1,

    cookie: {
      name: 'dazzlog_consent',
      expiresAfterDays: 180,
      sameSite: 'Lax',
      secure: true
    },

    guiOptions: {
      consentModal: {
        layout: 'box wide',
        position: 'bottom center',
        equalWeightButtons: false
      },
      preferencesModal: {
        layout: 'box',
        equalWeightButtons: false
      }
    },

    onConsent: updateGoogleAnalyticsState,
    onChange: updateGoogleAnalyticsState,

    categories: {
      necessary: {
        enabled: true,
        readOnly: true
      },
      analytics: {
        autoClear: {
          cookies: [
            { name: /^_ga/ }
          ]
        }
      }
    },

    language: {
      default: 'en',
      autoDetect: 'browser',
      translations: {
        de: {
          consentModal: {
            title: 'Datenschutzeinstellungen',
            description: 'Wir verwenden ein notwendiges Cookie, um deine Auswahl zu speichern. Mit deiner Einwilligung nutzt diese Website Google Analytics für aggregierte Nutzungsstatistiken.',
            acceptAllBtn: 'Alle akzeptieren',
            acceptNecessaryBtn: 'Nur notwendige',
            showPreferencesBtn: 'Einstellungen verwalten',
            footer: '<a href="/datenschutz/">Datenschutzerklärung</a><a href="/impressum/">Impressum</a>'
          },
          preferencesModal: {
            title: 'Datenschutzeinstellungen',
            acceptAllBtn: 'Alle akzeptieren',
            acceptNecessaryBtn: 'Nur notwendige',
            savePreferencesBtn: 'Auswahl speichern',
            closeIconLabel: 'Einstellungen schließen',
            sections: [
              {
                title: 'Deine Privatsphäre',
                description: 'Du kannst selbst entscheiden, ob Google Analytics aktiviert werden darf. Deine Auswahl kannst du jederzeit über „Cookie-Einstellungen“ im Footer ändern.'
              },
              {
                title: 'Notwendig',
                description: 'Dieses Cookie speichert ausschließlich deine Datenschutzauswahl und kann nicht deaktiviert werden.',
                linkedCategory: 'necessary',
                cookieTable: {
                  headers: {
                    name: 'Cookie',
                    purpose: 'Zweck',
                    duration: 'Dauer'
                  },
                  body: [
                    {
                      name: 'dazzlog_consent',
                      purpose: 'Speichert die gewählten Datenschutzeinstellungen.',
                      duration: '180 Tage'
                    }
                  ]
                }
              },
              {
                title: 'Statistik',
                description: 'Google Analytics hilft uns zu verstehen, wie der Blog genutzt wird. Der Dienst wird erst nach deiner Einwilligung geladen.',
                linkedCategory: 'analytics',
                cookieTable: {
                  headers: {
                    name: 'Cookie',
                    purpose: 'Zweck',
                    duration: 'Dauer'
                  },
                  body: [
                    {
                      name: '_ga, _ga_*',
                      purpose: 'Unterscheidung von Besuchen für Google Analytics.',
                      duration: 'bis zu 180 Tage'
                    }
                  ]
                }
              }
            ]
          }
        },
        en: {
          consentModal: {
            title: 'Privacy settings',
            description: 'We use one necessary cookie to remember your choice. With your consent, this website uses Google Analytics for aggregated usage statistics.',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Necessary only',
            showPreferencesBtn: 'Manage preferences',
            footer: '<a href="/datenschutz/">Privacy policy</a><a href="/impressum/">Legal notice</a>'
          },
          preferencesModal: {
            title: 'Privacy settings',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Necessary only',
            savePreferencesBtn: 'Save selection',
            closeIconLabel: 'Close preferences',
            sections: [
              {
                title: 'Your privacy',
                description: 'You decide whether Google Analytics may be enabled. You can change your choice at any time via “Cookie settings” in the footer.'
              },
              {
                title: 'Necessary',
                description: 'This cookie only stores your privacy choice and cannot be disabled.',
                linkedCategory: 'necessary',
                cookieTable: {
                  headers: {
                    name: 'Cookie',
                    purpose: 'Purpose',
                    duration: 'Duration'
                  },
                  body: [
                    {
                      name: 'dazzlog_consent',
                      purpose: 'Stores the selected privacy settings.',
                      duration: '180 days'
                    }
                  ]
                }
              },
              {
                title: 'Statistics',
                description: 'Google Analytics helps us understand how the blog is used. The service is only loaded after you consent.',
                linkedCategory: 'analytics',
                cookieTable: {
                  headers: {
                    name: 'Cookie',
                    purpose: 'Purpose',
                    duration: 'Duration'
                  },
                  body: [
                    {
                      name: '_ga, _ga_*',
                      purpose: 'Distinguishes visits for Google Analytics.',
                      duration: 'up to 180 days'
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    }
  });
})();
