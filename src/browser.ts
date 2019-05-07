import { browserManager } from 'headless-browser';
import { Browser as HeadlessBrowser } from 'headless-browser/lib/browser/Browser';
import { IEmulateOptions, Page } from 'headless-browser/lib/browser/Page';
import { combineLatest } from 'rxjs';
import { tap } from 'rxjs/internal/operators/tap';
import { flatMap, mapTo, shareReplay } from 'rxjs/operators';
import { config } from './config';
import { logger } from './logger';

export interface DeviceConfig extends IEmulateOptions {
  name : string;
}

export class Browser {
  public readonly launch$ = browserManager.openNewInstance()
    .pipe(
      flatMap(browser => this.registerDevices(browser)
        .pipe(
          mapTo(browser),
        )),
      shareReplay(1),
    );

  private readonly devicePageMap = new Map<string, Page>();

  private registerDevices (browser : HeadlessBrowser) {
    return combineLatest(config.devices.map(device => {
      return browser.openNewTab()
        .pipe(
          flatMap(page => {
            if (this.devicePageMap.has(device.name)) {
              throw new Error(`Device '${ device.name }' has already been registered`);
            }

            this.devicePageMap.set(device.name, page);
            return page.emulate(device)
              .pipe(
                mapTo(page),
                tap(() => {
                  logger.debug('Registered device with name: [' + device.name + ']');
                }),
              );
          }),
        );
    }));
  }

  public getDevicePage (name : string) {
    const page = this.devicePageMap.get(name);
    if (!page) {
      throw new Error(`Unknown device named: '${ name }'`);
    }
    return page;
  }
}
